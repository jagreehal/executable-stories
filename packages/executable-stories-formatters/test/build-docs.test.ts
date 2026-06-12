import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  buildDocs,
  bundleExplorerAssets,
  partitionByAudience,
  BuildDocsError,
} from "../src/build-docs";
import type { TestRunResult } from "../src/types/test-result";

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-build-docs-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function writeReport(docEntries: unknown[]): string {
  const reportPath = path.join(dir, "story-report.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ features: [{ scenarios: [{ docEntries }] }] }),
    "utf8",
  );
  return reportPath;
}

describe("bundleExplorerAssets", () => {
  it("copies a local video into assets and rewrites the path to a served URL", () => {
    const videoPath = path.join(dir, "demo.webm");
    fs.writeFileSync(videoPath, Buffer.alloc(64, 0));
    const reportPath = writeReport([{ kind: "video", path: videoPath, phase: "runtime" }]);
    const assetsDir = path.join(dir, "assets");

    const copied = bundleExplorerAssets(reportPath, assetsDir);

    expect(copied).toBe(1);
    expect(fs.readdirSync(assetsDir).some((f) => f.endsWith(".webm"))).toBe(true);
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    expect(report.features[0].scenarios[0].docEntries[0].path).toMatch(/^\/stories\/assets\/demo-[a-f0-9]+\.webm$/);
  });

  it("bundles a poster image alongside the video", () => {
    const videoPath = path.join(dir, "v.webm");
    const posterPath = path.join(dir, "poster.png");
    fs.writeFileSync(videoPath, Buffer.alloc(64, 0));
    fs.writeFileSync(posterPath, Buffer.alloc(64, 1));
    const reportPath = writeReport([
      { kind: "video", path: videoPath, poster: posterPath, phase: "runtime" },
    ]);

    expect(bundleExplorerAssets(reportPath, path.join(dir, "assets"))).toBe(2);
  });

  it("leaves remote and already-served paths untouched", () => {
    const reportPath = writeReport([
      { kind: "video", path: "https://example.com/v.mp4", phase: "runtime" },
      { kind: "screenshot", path: "/stories/assets/already.png", phase: "runtime" },
    ]);

    const copied = bundleExplorerAssets(reportPath, path.join(dir, "assets"));

    expect(copied).toBe(0);
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    expect(report.features[0].scenarios[0].docEntries[0].path).toBe("https://example.com/v.mp4");
    expect(report.features[0].scenarios[0].docEntries[1].path).toBe("/stories/assets/already.png");
  });

  it("recurses into child doc entries", () => {
    const imgPath = path.join(dir, "child.png");
    fs.writeFileSync(imgPath, Buffer.alloc(64, 0));
    const reportPath = writeReport([
      { kind: "note", text: "parent", phase: "runtime", children: [{ kind: "screenshot", path: imgPath, phase: "runtime" }] },
    ]);

    expect(bundleExplorerAssets(reportPath, path.join(dir, "assets"))).toBe(1);
  });
});

describe("buildDocs", () => {
  function writeRawRun(extraDocs: unknown[] = []): string {
    const rawRun = {
      schemaVersion: 1,
      projectRoot: dir,
      startedAtMs: 1706745600000,
      finishedAtMs: 1706745612345,
      testCases: [
        {
          title: "creates a transfer",
          status: "pass",
          sourceFile: "tests/transfer.story.test.ts",
          story: {
            scenario: "creates a transfer",
            tags: ["createTransfer"],
            steps: [
              { keyword: "Given", text: "a request" },
              { keyword: "Then", text: "it completes" },
            ],
            docs: extraDocs,
          },
        },
      ],
    };
    const p = path.join(dir, "raw-run.json");
    fs.writeFileSync(p, JSON.stringify(rawRun), "utf8");
    return p;
  }

  it("generates explorer data, story pages, API pages, and bundles a local video", async () => {
    const videoPath = path.join(dir, "demo.webm");
    fs.writeFileSync(videoPath, Buffer.alloc(128, 0));
    const rawRunPath = writeRawRun([{ kind: "video", path: videoPath, caption: "demo", phase: "runtime" }]);

    const specPath = path.join(dir, "openapi.json");
    fs.writeFileSync(
      specPath,
      JSON.stringify({
        openapi: "3.0.0",
        info: { title: "API", version: "1" },
        paths: { "/api/transfer": { post: { operationId: "createTransfer", summary: "Create", tags: ["Transfers"] } } },
      }),
    );

    const siteDir = path.join(dir, "site");
    const result = await buildDocs({ rawRunPath, siteDir, openapiPath: specPath });

    expect(result.bundledAssets).toBe(1);
    expect(result.apiPages).toBe(2); // index + Transfers

    const report = fs.readFileSync(path.join(siteDir, "public/stories/story-report.json"), "utf8");
    expect(report).toContain('"kind": "video"');
    expect(report).toContain("/stories/assets/");
    expect(report).not.toContain(videoPath);

    // Colocated → one page per source file, cleanly named by its stem. Default
    // layout is flat (audience split is opt-in), so the page sits at the root.
    expect(fs.existsSync(path.join(siteDir, "src/content/docs/stories/transfer.md"))).toBe(true);
    expect(fs.existsSync(path.join(siteDir, "src/content/docs/stories/engineer/transfer.md"))).toBe(false);
    const apiPage = fs.readFileSync(path.join(siteDir, "src/content/docs/api/transfers/index.mdx"), "utf8");
    expect(apiPage).toContain("ApiOperations");
  });

  it("works without an OpenAPI spec (no API pages)", async () => {
    const rawRunPath = writeRawRun();
    const siteDir = path.join(dir, "site");
    const result = await buildDocs({ rawRunPath, siteDir });
    expect(result.apiPages).toBe(0);
    expect(fs.existsSync(path.join(siteDir, "public/stories/story-report.json"))).toBe(true);
  });

  it("throws a schema-kind BuildDocsError on an unsupported schemaVersion", async () => {
    const rawRunPath = path.join(dir, "bad.json");
    fs.writeFileSync(rawRunPath, JSON.stringify({ schemaVersion: 99, testCases: [] }));
    await expect(buildDocs({ rawRunPath, siteDir: path.join(dir, "site") })).rejects.toBeInstanceOf(
      BuildDocsError,
    );
    await expect(buildDocs({ rawRunPath, siteDir: path.join(dir, "site") })).rejects.toMatchObject({
      kind: "schema",
    });
  });
});

describe("partitionByAudience", () => {
  function run(cases: Array<{ sourceFile: string; tags?: string[] }>): TestRunResult {
    return {
      projectRoot: "/x",
      runId: "r",
      startedAtMs: 0,
      finishedAtMs: 1,
      durationMs: 1,
      testCases: cases.map((c) => ({ sourceFile: c.sourceFile, tags: c.tags ?? [] })),
    } as unknown as TestRunResult;
  }

  it("routes e2e/spec files to stakeholder and the rest to engineer", () => {
    const result = partitionByAudience(
      run([
        { sourceFile: "tests/transfer.story.test.ts" },
        { sourceFile: "tests/login.unit.test.ts" },
        { sourceFile: "tests/checkout.story.spec.ts" },
        { sourceFile: "e2e/signup.test.ts" },
      ]),
    );

    expect(result.engineer.testCases.map((t) => t.sourceFile)).toEqual([
      "tests/transfer.story.test.ts",
      "tests/login.unit.test.ts",
    ]);
    expect(result.stakeholder.testCases.map((t) => t.sourceFile)).toEqual([
      "tests/checkout.story.spec.ts",
      "e2e/signup.test.ts",
    ]);
  });

  it("honours an explicit audience:* tag over the file convention", () => {
    const result = partitionByAudience(
      run([{ sourceFile: "tests/transfer.story.test.ts", tags: ["audience:stakeholder"] }]),
    );

    expect(result.stakeholder.testCases).toHaveLength(1);
    expect(result.engineer.testCases).toHaveLength(0);
  });

  it("carries run metadata into each sub-run", () => {
    const result = partitionByAudience(run([{ sourceFile: "a.test.ts" }]));
    expect(result.engineer.runId).toBe("r");
    expect(result.stakeholder.projectRoot).toBe("/x");
  });
});

describe("buildDocs audience split", () => {
  function writeRawRun(): string {
    const mkCase = (title: string, sourceFile: string) => ({
      title,
      status: "pass",
      sourceFile,
      story: {
        scenario: title,
        tags: [],
        steps: [
          { keyword: "Given", text: "a precondition" },
          { keyword: "Then", text: "an outcome" },
        ],
        docs: [],
      },
    });
    const rawRun = {
      schemaVersion: 1,
      projectRoot: dir,
      startedAtMs: 1706745600000,
      finishedAtMs: 1706745612345,
      testCases: [
        mkCase("adds two numbers", "tests/math.story.test.ts"),
        mkCase("guest can check out", "e2e/checkout.story.spec.ts"),
      ],
    };
    const p = path.join(dir, "raw-run.json");
    fs.writeFileSync(p, JSON.stringify(rawRun), "utf8");
    return p;
  }

  it("splits pages into engineer/ and stakeholder/ subdirs when audienceSplit is on", async () => {
    const siteDir = path.join(dir, "site");
    const result = await buildDocs({ rawRunPath: writeRawRun(), siteDir, audienceSplit: true });

    expect(result.audiences).toEqual({ engineer: 1, stakeholder: 1 });
    const storiesDir = path.join(siteDir, "src/content/docs/stories");
    expect(fs.existsSync(path.join(storiesDir, "engineer/math.md"))).toBe(true);
    expect(fs.existsSync(path.join(storiesDir, "stakeholder/checkout.md"))).toBe(true);
    // No flat page at the stories root once split.
    expect(fs.existsSync(path.join(storiesDir, "math.md"))).toBe(false);

    // Deep-link index is written and its entries point at the audience-split pages.
    expect(result.scenarioLinks).toBe(2);
    const links = JSON.parse(
      fs.readFileSync(path.join(siteDir, "public/stories/scenario-links.json"), "utf8"),
    );
    const entries = Object.values(links.scenarios) as Array<Record<string, string>>;
    const checkout = entries.find((e) => e.title === "guest can check out")!;
    expect(checkout.deepLink).toBe(
      "/stories/stakeholder/checkout/#scenario-guest-can-check-out",
    );

    // The page emits the matching anchor, so the fragment resolves.
    const checkoutPage = fs.readFileSync(path.join(storiesDir, "stakeholder/checkout.md"), "utf8");
    expect(checkoutPage).toContain('<a id="scenario-guest-can-check-out"></a>');
  });

  it("falls back to a flat layout when audienceSplit is false", async () => {
    const siteDir = path.join(dir, "site");
    const result = await buildDocs({
      rawRunPath: writeRawRun(),
      siteDir,
      audienceSplit: false,
    });

    const storiesDir = path.join(siteDir, "src/content/docs/stories");
    expect(fs.existsSync(path.join(storiesDir, "math.md"))).toBe(true);
    expect(fs.existsSync(path.join(storiesDir, "checkout.md"))).toBe(true);
    expect(fs.existsSync(path.join(storiesDir, "engineer"))).toBe(false);
    // audiences is still reported (counts), even when not used for layout.
    expect(result.audiences).toEqual({ engineer: 0, stakeholder: 0 });
  });

  it("emits a what's-changed page and changes.json when a baseline is given", async () => {
    const siteDir = path.join(dir, "site");

    // First run → its story-report becomes the baseline.
    await buildDocs({ rawRunPath: writeRawRun(), siteDir });
    const baselinePath = path.join(dir, "baseline.json");
    fs.copyFileSync(path.join(siteDir, "public/stories/story-report.json"), baselinePath);

    // Second run, identical scenarios → no behavioural change.
    const result = await buildDocs({ rawRunPath: writeRawRun(), siteDir, baselinePath });

    expect(result.changes).toBeDefined();
    expect(result.changes).toMatchObject({ added: 0, removed: 0, regressed: 0 });
    expect(result.changes!.unchanged).toBe(2);

    const changesPage = path.join(siteDir, "src/content/docs/stories/changes.md");
    expect(fs.existsSync(changesPage)).toBe(true);
    expect(fs.readFileSync(changesPage, "utf8")).toContain("No behavioural changes since the baseline");
    expect(fs.existsSync(path.join(siteDir, "public/stories/changes.json"))).toBe(true);
  });

  it("always writes a Stories overview index page", async () => {
    const siteDir = path.join(dir, "site");
    await buildDocs({ rawRunPath: writeRawRun(), siteDir });
    const overview = path.join(siteDir, "src/content/docs/stories/index.md");
    expect(fs.existsSync(overview)).toBe(true);
    const content = fs.readFileSync(overview, "utf8");
    expect(content).toContain("title: Stories");
    expect(content).toContain("## 🔧 Engineer");
    expect(content).toContain("## 🎬 Stakeholder");
  });

  it("bakes what's-changed badges into the pages of added/regressed scenarios", async () => {
    const siteDir = path.join(dir, "site");
    await buildDocs({ rawRunPath: writeRawRun(), siteDir });
    const baselinePath = path.join(dir, "baseline.json");
    fs.copyFileSync(path.join(siteDir, "public/stories/story-report.json"), baselinePath);

    // Mutate the run: add a brand-new engineer scenario in a new file.
    const raw = JSON.parse(fs.readFileSync(writeRawRun(), "utf8"));
    raw.testCases.push({
      title: "subtracts two numbers",
      status: "pass",
      sourceFile: "tests/math2.story.test.ts",
      story: {
        scenario: "subtracts two numbers",
        tags: [],
        steps: [
          { keyword: "Given", text: "two numbers" },
          { keyword: "Then", text: "the difference" },
        ],
        docs: [],
      },
    });
    const rawB = path.join(dir, "rawB.json");
    fs.writeFileSync(rawB, JSON.stringify(raw), "utf8");

    const result = await buildDocs({ rawRunPath: rawB, siteDir, baselinePath });
    expect(result.changes).toMatchObject({ added: 1 });

    const newPage = fs.readFileSync(
      path.join(siteDir, "src/content/docs/stories/math2.md"),
      "utf8",
    );
    expect(newPage).toContain("🆕 **New** _since last run_");
  });

  it("throws an input-kind BuildDocsError when the baseline is missing", async () => {
    const siteDir = path.join(dir, "site");
    await expect(
      buildDocs({
        rawRunPath: writeRawRun(),
        siteDir,
        baselinePath: path.join(dir, "does-not-exist.json"),
      }),
    ).rejects.toMatchObject({ kind: "input" });
  });

  it("removes a stale changes.json/.md when a later run has no baseline", async () => {
    const siteDir = path.join(dir, "site");
    await buildDocs({ rawRunPath: writeRawRun(), siteDir });
    const baselinePath = path.join(dir, "baseline.json");
    fs.copyFileSync(path.join(siteDir, "public/stories/story-report.json"), baselinePath);

    // Run with a baseline → change artifacts exist.
    await buildDocs({ rawRunPath: writeRawRun(), siteDir, baselinePath });
    const changesJson = path.join(siteDir, "public/stories/changes.json");
    const changesMd = path.join(siteDir, "src/content/docs/stories/changes.md");
    expect(fs.existsSync(changesJson)).toBe(true);

    // Re-run WITHOUT a baseline → stale artifacts must be gone.
    await buildDocs({ rawRunPath: writeRawRun(), siteDir });
    expect(fs.existsSync(changesJson)).toBe(false);
    expect(fs.existsSync(changesMd)).toBe(false);
  });
});
