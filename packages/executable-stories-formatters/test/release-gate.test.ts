import { describe, expect, it } from "vitest";
import { diffRuns } from "../src/compare/diff-runs";
import { stubs } from "./stubs";

describe("release gate", () => {
  it("detects regressions in RC vs dev baseline", () => {
    const dev = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "scenario-1",
          status: "passed",
          sourceFile: "src/login.story.test.ts",
          sourceLine: 1,
          story: stubs.storyMeta({ scenario: "Login works" }),
        }),
      ],
    });

    const rc = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "scenario-1",
          status: "failed",
          sourceFile: "src/login.story.test.ts",
          sourceLine: 1,
          errorMessage: "regression!",
          story: stubs.storyMeta({ scenario: "Login works" }),
        }),
      ],
    });

    const diff = diffRuns(dev, rc);
    expect(diff.summary.regressed).toBe(1);
    expect(diff.summary.unchanged).toBe(0);
  });

  it("detects omissions (scenarios in dev but not in RC)", () => {
    const shared = stubs.testCaseResult({
      id: "scenario-a",
      status: "passed",
      durationMs: 100,
      sourceFile: "src/a.story.test.ts",
      sourceLine: 1,
      titlePath: [],
      stepResults: [],
      story: stubs.storyMeta({ scenario: "Feature A", docs: [] }),
    });

    const dev = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        shared,
        stubs.testCaseResult({
          id: "scenario-b",
          status: "passed",
          durationMs: 100,
          sourceFile: "src/b.story.test.ts",
          sourceLine: 1,
          titlePath: [],
          stepResults: [],
          story: stubs.storyMeta({ scenario: "Feature B", docs: [] }),
        }),
      ],
    });

    const rc = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [shared],
    });

    const diff = diffRuns(dev, rc);
    expect(diff.summary.removed).toBe(1);
    expect(diff.summary.unchanged).toBe(1);
  });

  it("detects fixed scenarios in RC", () => {
    const dev = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [
        stubs.testCaseResult({
          id: "scenario-1",
          status: "failed",
          sourceFile: "src/bug.story.test.ts",
          sourceLine: 1,
          errorMessage: "old bug",
          story: stubs.storyMeta({ scenario: "Buggy feature" }),
        }),
      ],
    });

    const rc = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        stubs.testCaseResult({
          id: "scenario-1",
          status: "passed",
          sourceFile: "src/bug.story.test.ts",
          sourceLine: 1,
          story: stubs.storyMeta({ scenario: "Buggy feature" }),
        }),
      ],
    });

    const diff = diffRuns(dev, rc);
    expect(diff.summary.fixed).toBe(1);
  });

  it("detects new scenarios in RC not in dev", () => {
    const shared = stubs.testCaseResult({
      id: "scenario-a",
      status: "passed",
      durationMs: 100,
      sourceFile: "src/a.story.test.ts",
      sourceLine: 1,
      titlePath: [],
      stepResults: [],
      story: stubs.storyMeta({ scenario: "Feature A", docs: [] }),
    });

    const dev = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [shared],
    });

    const rc = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [
        shared,
        stubs.testCaseResult({
          id: "scenario-c",
          status: "passed",
          durationMs: 100,
          sourceFile: "src/c.story.test.ts",
          sourceLine: 1,
          titlePath: [],
          stepResults: [],
          story: stubs.storyMeta({ scenario: "Feature C (new)", docs: [] }),
        }),
      ],
    });

    const diff = diffRuns(dev, rc);
    expect(diff.summary.added).toBe(1);
    expect(diff.summary.unchanged).toBe(1);
  });

  it("passes when RC matches dev baseline exactly", () => {
    const s1 = stubs.testCaseResult({
      id: "scenario-1",
      status: "passed",
      durationMs: 100,
      sourceFile: "src/a.story.test.ts",
      sourceLine: 1,
      titlePath: [],
      stepResults: [],
      story: stubs.storyMeta({ scenario: "Feature A", docs: [] }),
    });
    const s2 = stubs.testCaseResult({
      id: "scenario-2",
      status: "passed",
      durationMs: 100,
      sourceFile: "src/b.story.test.ts",
      sourceLine: 1,
      titlePath: [],
      stepResults: [],
      story: stubs.storyMeta({ scenario: "Feature B", docs: [] }),
    });

    const dev = stubs.testRunResult({
      startedAtMs: 1000,
      finishedAtMs: 2000,
      testCases: [s1, s2],
    });

    const rc = stubs.testRunResult({
      startedAtMs: 3000,
      finishedAtMs: 4000,
      testCases: [s1, s2],
    });

    const diff = diffRuns(dev, rc);
    expect(diff.summary.regressed).toBe(0);
    expect(diff.summary.removed).toBe(0);
    expect(diff.summary.added).toBe(0);
    expect(diff.summary.unchanged).toBe(2);
  });
});
