import { describe, expect, it } from "vitest";
import { diffStoryReports } from "../src/behavior-diff";
import type { StoryReport, TestStatus } from "../src/types/story-report";

function report(scenarios: Array<{ id: string; status: TestStatus }>): StoryReport {
  return {
    schemaVersion: "1.0",
    runId: "r",
    startedAtMs: 0,
    finishedAtMs: 1,
    durationMs: 1,
    projectRoot: "/repo",
    summary: { total: scenarios.length, passed: 0, failed: 0, skipped: 0, pending: 0, durationMs: 1 },
    features: [
      {
        id: "f",
        title: "F",
        sourceFile: "t.test.ts",
        summary: { total: scenarios.length, passed: 0, failed: 0, skipped: 0, pending: 0, durationMs: 1 },
        scenarios: scenarios.map((s) => ({
          id: s.id,
          title: s.id,
          status: s.status,
          durationMs: 0,
          tags: [],
          retry: 0,
          retries: 0,
          docEntries: [],
          steps: [],
          attachments: [],
        })),
      },
    ],
  } as unknown as StoryReport;
}

describe("diffStoryReports", () => {
  it("classifies regressed / fixed / added / removed / unchanged", () => {
    const baseline = report([
      { id: "stable", status: "passed" },
      { id: "breaks", status: "passed" },
      { id: "heals", status: "failed" },
      { id: "gone", status: "passed" },
    ]);
    const current = report([
      { id: "stable", status: "passed" },
      { id: "breaks", status: "failed" },
      { id: "heals", status: "passed" },
      { id: "new", status: "passed" },
    ]);

    const diff = diffStoryReports(baseline, current);
    const kind = (id: string) => diff.scenarios.find((s) => s.id === id)?.kind;

    expect(kind("stable")).toBe("unchanged");
    expect(kind("breaks")).toBe("regressed");
    expect(kind("heals")).toBe("fixed");
    expect(kind("new")).toBe("added");
    expect(kind("gone")).toBe("removed");
    expect(diff.summary).toMatchObject({ regressed: 1, fixed: 1, added: 1, removed: 1, unchanged: 1 });
  });
});
