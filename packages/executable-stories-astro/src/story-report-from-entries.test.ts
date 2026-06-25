import { describe, expect, it } from "vitest";

import { storyReportFromEntries } from "./story-report-from-entries.js";
import type { StoryEntryData } from "./loader.js";

function entry(over: Partial<StoryEntryData> & Pick<StoryEntryData, "id" | "title" | "status">): StoryEntryData {
  return {
    steps: [],
    docEntries: [],
    attachments: [],
    tags: [],
    durationMs: 0,
    entryId: `e-${over.id}`,
    slug: over.id,
    feature: { id: "f1", title: "Feature One", sourceFile: "a.story.test.ts" },
    source: { name: "default", label: "Stories" },
    run: { runId: "run-1", finishedAtMs: 1000, gitSha: "abc123" },
    ...over,
  } as StoryEntryData;
}

describe("storyReportFromEntries", () => {
  it("returns an empty report (no features) for no entries", () => {
    const report = storyReportFromEntries([]);
    expect(report.features).toEqual([]);
    expect(report.summary.total).toBe(0);
    expect(report.schemaVersion).toBe("1.0");
  });

  it("groups entries by feature, preserving first-seen order", () => {
    const report = storyReportFromEntries([
      entry({ id: "s1", title: "A", status: "passed", feature: { id: "f1", title: "Feature One", sourceFile: "a.ts" } }),
      entry({ id: "s2", title: "B", status: "failed", feature: { id: "f2", title: "Feature Two", sourceFile: "b.ts" } }),
      entry({ id: "s3", title: "C", status: "passed", feature: { id: "f1", title: "Feature One", sourceFile: "a.ts" } }),
    ]);
    expect(report.features.map((f) => f.id)).toEqual(["f1", "f2"]);
    expect(report.features[0]?.scenarios.map((s) => s.id)).toEqual(["s1", "s3"]);
    expect(report.features[1]?.scenarios.map((s) => s.id)).toEqual(["s2"]);
  });

  it("tallies feature + report summaries by status", () => {
    const report = storyReportFromEntries([
      entry({ id: "s1", title: "A", status: "passed", durationMs: 10 }),
      entry({ id: "s2", title: "B", status: "failed", durationMs: 20 }),
      entry({ id: "s3", title: "C", status: "skipped", durationMs: 5 }),
    ]);
    expect(report.summary).toMatchObject({ total: 3, passed: 1, failed: 1, skipped: 1, durationMs: 35 });
    expect(report.features[0]?.summary).toMatchObject({ total: 3, passed: 1, failed: 1, skipped: 1 });
  });

  it("carries run-level meta and strips entry-only fields off scenarios", () => {
    const report = storyReportFromEntries([
      entry({ id: "s1", title: "A", status: "passed", durationMs: 40 }),
    ]);
    expect(report.runId).toBe("run-1");
    expect(report.gitSha).toBe("abc123");
    expect(report.finishedAtMs).toBe(1000);
    expect(report.startedAtMs).toBe(960);
    const scenario = report.features[0]?.scenarios[0] as unknown as Record<string, unknown>;
    expect(scenario.id).toBe("s1");
    expect(scenario).not.toHaveProperty("entryId");
    expect(scenario).not.toHaveProperty("slug");
    expect(scenario).not.toHaveProperty("feature");
    expect(scenario).not.toHaveProperty("run");
  });
});
