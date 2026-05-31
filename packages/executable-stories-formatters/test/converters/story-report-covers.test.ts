import { describe, expect, it } from "vitest";
import { toStoryReport } from "../../src/converters/story-report";
import { toScenarioIndex } from "../../src/formatters/scenario-index-json";
import type { TestRunResult } from "../../src/types/test-result";

function runWithCovers(covers?: string[]): TestRunResult {
  return {
    runId: "r1",
    startedAtMs: 0,
    finishedAtMs: 1,
    durationMs: 1,
    projectRoot: "/repo",
    summary: { total: 1, passed: 1, failed: 0, skipped: 0, pending: 0, durationMs: 1 },
    testCases: [
      {
        id: "tc1",
        title: "Login blocked",
        titlePath: ["Login blocked"],
        sourceFile: "src/auth.story.test.ts",
        sourceLine: 10,
        status: "passed",
        durationMs: 1,
        tags: [],
        stepResults: [],
        attachments: [],
        story: { scenario: "Login blocked", steps: [], covers },
      },
    ],
  } as unknown as TestRunResult;
}

describe("covers flows through the pipeline", () => {
  it("copies covers onto the StoryReport scenario", () => {
    const report = toStoryReport(runWithCovers(["src/auth/**"]));
    expect(report.features[0].scenarios[0].covers).toEqual(["src/auth/**"]);
  });

  it("defaults covers to [] on the scenario index item", () => {
    const report = toStoryReport(runWithCovers(undefined));
    const index = toScenarioIndex(report);
    expect(index.scenarios[0].covers).toEqual([]);
  });

  it("carries covers into the scenario index item", () => {
    const report = toStoryReport(runWithCovers(["src/auth/login.ts"]));
    const index = toScenarioIndex(report);
    expect(index.scenarios[0].covers).toEqual(["src/auth/login.ts"]);
  });
});
