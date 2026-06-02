import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildDocs, bundleExplorerAssets, BuildDocsError } from "../src/build-docs";

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

    // Flat colocated → one page per source file, cleanly named by its stem.
    expect(fs.existsSync(path.join(siteDir, "src/content/docs/stories/transfer.md"))).toBe(true);
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
