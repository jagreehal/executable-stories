import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { buildStoryEntries, groupScenarios, countByStatus, storiesLoader, type StoryEntryData } from "./loader.js";
import type { ResolvedSource } from "./config.js";
import type { RawRun } from "executable-stories-core";

const SRC = (name: string): ResolvedSource => ({
  source: "",
  name,
  label: name.toUpperCase(),
  inputType: "raw",
  synthesize: true,
});

/** Minimal raw run with two scenarios in one file, plus a .js/.ts twin to force an id collision. */
function rawRun(): RawRun {
  const mk = (sourceFile: string, scenario: string, status: "pass" | "fail") => ({
    title: scenario,
    sourceFile,
    sourceLine: 1,
    status,
    story: {
      scenario,
      steps: [{ keyword: "given" as const, text: "a precondition", status }],
    },
  });
  return {
    schemaVersion: "1.0",
    projectRoot: "/repo",
    startedAtMs: 1000,
    finishedAtMs: 2000,
    testCases: [
      mk("src/login.story.test.ts", "User logs in", "pass"),
      mk("src/login.story.test.ts", "User logs out", "fail"),
      // .js twin of the first scenario — same generated scenario id (extension stripped)
      mk("src/login.story.test.js", "User logs in", "pass"),
    ],
  } as unknown as RawRun;
}

describe("buildStoryEntries", () => {
  it("flattens features into one entry per scenario", () => {
    const entries = buildStoryEntries(rawRun(), { inputType: "raw" });
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.title).sort()).toEqual([
      "User logs in",
      "User logs in",
      "User logs out",
    ]);
  });

  it("maps raw status through canonicalization (fail -> failed)", () => {
    const entries = buildStoryEntries(rawRun(), { inputType: "raw" });
    const byStatus = entries.reduce<Record<string, number>>((m, e) => {
      m[e.status] = (m[e.status] ?? 0) + 1;
      return m;
    }, {});
    expect(byStatus.passed).toBe(2);
    expect(byStatus.failed).toBe(1);
  });

  it("gives every entry a unique entryId even when scenario.id collides across .js/.ts twins", () => {
    const entries = buildStoryEntries(rawRun(), { inputType: "raw" });
    const twins = entries.filter((e) => e.title === "User logs in");
    expect(twins).toHaveLength(2);
    // same canonical scenario id...
    expect(twins[0]!.id).toBe(twins[1]!.id);
    // ...but distinct store keys, so neither is dropped
    const entryIds = entries.map((e) => e.entryId);
    expect(new Set(entryIds).size).toBe(entries.length);
    expect(twins[0]!.entryId).not.toBe(twins[1]!.entryId);
  });

  it("gives each entry a readable, unique URL slug from its title", () => {
    const entries = buildStoryEntries(rawRun(), { inputType: "raw" });
    // Readable: the slug is the slugified title, not the long collision-proof entryId.
    expect(entries.map((e) => e.slug).sort()).toEqual([
      "user-logs-in",
      "user-logs-in-2", // twin title disambiguated with a numeric suffix
      "user-logs-out",
    ]);
    // Unique: every scenario gets a distinct slug so no detail page is dropped.
    expect(new Set(entries.map((e) => e.slug)).size).toBe(entries.length);
  });

  it("disambiguates same-title slugs across multiple sources via a shared map", () => {
    const slugSeen = new Map<string, number>();
    const a = buildStoryEntries(rawRun(), {}, SRC("web"), slugSeen);
    const b = buildStoryEntries(rawRun(), {}, SRC("api"), slugSeen);
    const allSlugs = [...a, ...b].map((e) => e.slug);
    expect(new Set(allSlugs).size).toBe(allSlugs.length);
  });

  it("flattens the owning feature onto each entry", () => {
    const entries = buildStoryEntries(rawRun(), { inputType: "raw" });
    for (const e of entries) {
      expect(e.feature.sourceFile).toMatch(/login\.story\.test\.(ts|js)$/);
      expect(typeof e.run.runId).toBe("string");
    }
  });

  it("filters scenarios by include.status", () => {
    const entries = buildStoryEntries(rawRun(), { include: { status: ["failed"] } });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.title).toBe("User logs out");
  });

  it("filters scenarios by exclude.status", () => {
    const entries = buildStoryEntries(rawRun(), { exclude: { status: ["failed"] } });
    expect(entries.every((e) => e.status === "passed")).toBe(true);
  });

  it("stamps each entry with its source and qualifies entryIds by source name", () => {
    const entries = buildStoryEntries(rawRun(), {}, SRC("cdk"));
    expect(entries.every((e) => e.source.name === "cdk" && e.source.label === "CDK")).toBe(true);
    expect(entries.every((e) => e.entryId.startsWith("cdk::"))).toBe(true);
  });
});

describe("groupScenarios", () => {
  const entry = (over: Partial<StoryEntryData>): StoryEntryData =>
    ({
      id: "s",
      entryId: `e-${Math.round((over.durationMs ?? 0) + (over.title?.length ?? 0))}`,
      slug: "t",
      title: "t",
      status: "passed",
      tags: [],
      durationMs: 0,
      retry: 0,
      retries: 0,
      docEntries: [],
      steps: [],
      attachments: [],
      feature: { id: "f", title: "Login", sourceFile: "src/login.test.ts" },
      source: { name: "cdk", label: "CDK" },
      run: { runId: "r", finishedAtMs: 0 },
      ...over,
    }) as StoryEntryData;

  const scenarios = [
    entry({ title: "a", status: "passed", tags: ["security"], feature: { id: "f1", title: "Auth", sourceFile: "auth.ts" } }),
    entry({ title: "b", status: "failed", tags: ["security", "ui"], feature: { id: "f1", title: "Auth", sourceFile: "auth.ts" } }),
    entry({ title: "c", status: "passed", tags: [], source: { name: "cli", label: "CLI" }, feature: { id: "f2", title: "CLI", sourceFile: "cli.ts" } }),
  ];

  it("groups by feature (default)", () => {
    const groups = groupScenarios(scenarios, "feature");
    expect(groups.map((g) => g.label)).toEqual(["Auth", "CLI"]);
    expect(groups[0]!.items).toHaveLength(2);
  });

  it("groups by status", () => {
    const groups = groupScenarios(scenarios, "status");
    expect(groups.map((g) => g.label).sort()).toEqual(["Failed", "Passed"]);
  });

  it("groups by source (suite)", () => {
    const groups = groupScenarios(scenarios, "source");
    expect(groups.map((g) => g.label).sort()).toEqual(["CDK", "CLI"]);
  });

  it("groups by tag, listing a scenario under each tag, with an Untagged bucket", () => {
    const groups = groupScenarios(scenarios, "tag");
    const labels = groups.map((g) => g.label);
    expect(labels).toContain("security");
    expect(labels).toContain("ui");
    expect(labels).toContain("Untagged");
    // "b" has two tags -> appears in both security and ui groups
    expect(groups.find((g) => g.label === "security")!.items).toHaveLength(2);
    expect(groups.find((g) => g.label === "ui")!.items).toHaveLength(1);
  });

  it("groups into one bucket with `none`", () => {
    const groups = groupScenarios(scenarios, "none");
    expect(groups).toHaveLength(1);
    expect(groups[0]!.items).toHaveLength(3);
  });
});

describe("countByStatus", () => {
  const entry = (status: StoryEntryData["status"]): StoryEntryData =>
    ({ status }) as StoryEntryData;

  it("tallies passed/failed and folds pending into skipped", () => {
    const counts = countByStatus([
      entry("passed"),
      entry("passed"),
      entry("failed"),
      entry("skipped"),
      entry("pending"),
    ]);
    expect(counts).toEqual({ total: 5, passed: 2, failed: 1, skipped: 2 });
  });

  it("returns zeroes for an empty list", () => {
    expect(countByStatus([])).toEqual({ total: 0, passed: 0, failed: 0, skipped: 0 });
  });
});

describe("storiesLoader sampleSource fallback", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-sample-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function fakeCtx() {
    const store = new Map<string, Record<string, unknown>>();
    return {
      entries: store,
      ctx: {
        store: {
          clear: () => store.clear(),
          set: (e: { id: string; data: Record<string, unknown> }) => store.set(e.id, e.data),
        },
        logger: { info: () => {}, warn: () => {} },
      },
    };
  }

  it("falls back to sampleSource (flagged) when the real source is missing", async () => {
    const realPath = path.join(dir, "raw-run.json"); // intentionally absent
    const samplePath = path.join(dir, "sample-run.json");
    fs.writeFileSync(samplePath, JSON.stringify(rawRun()));

    const loader = storiesLoader({ source: realPath, sampleSource: samplePath });
    const { entries, ctx } = fakeCtx();
    await loader.load(ctx as never);

    expect(entries.size).toBeGreaterThan(0);
    for (const data of entries.values()) {
      expect((data as { sample?: boolean }).sample).toBe(true);
    }
  });

  it("prefers the real source and does NOT flag sample when it exists", async () => {
    const realPath = path.join(dir, "raw-run.json");
    const samplePath = path.join(dir, "sample-run.json");
    fs.writeFileSync(realPath, JSON.stringify(rawRun()));
    fs.writeFileSync(samplePath, JSON.stringify(rawRun()));

    const loader = storiesLoader({ source: realPath, sampleSource: samplePath });
    const { entries, ctx } = fakeCtx();
    await loader.load(ctx as never);

    expect(entries.size).toBeGreaterThan(0);
    for (const data of entries.values()) {
      expect((data as { sample?: boolean }).sample).toBeUndefined();
    }
  });
});
