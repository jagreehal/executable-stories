import { describe, it, expect } from "vitest";
import { story } from "executable-stories-vitest";
import { canonicalizeRun } from "executable-stories-core/converters/acl/index";
import { validateCanonicalRun } from "executable-stories-core/converters/acl/validate";
import {
  createRawRun,
  createPassingTestCase,
  createFailingTestCase,
  createSkippedTestCase,
  createMultipleTestCasesRun,
} from "../fixtures/raw-runs/basic";

describe("ACL Canonicalization Pipeline", () => {
  it("transforms a raw run into a valid canonical format", ({ task }) => {
    story.init(task);

    story.given("a basic raw run from a test framework adapter");
    const raw = createRawRun();

    story.when("the run is canonicalized");
    const result = canonicalizeRun(raw);

    story.then("it produces a TestRunResult with correct metadata");
    expect(result.testCases).toHaveLength(1);
    expect(result.projectRoot).toBe("/project");
    expect(result.runId).toBeTruthy();
    expect(result.packageVersion).toBe("1.0.0");
    expect(result.gitSha).toBe("abc1234");

    story.and("the result passes schema validation");
    const validation = validateCanonicalRun(result);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("normalizes adapter-specific statuses to canonical values", ({ task }) => {
    story.init(task);

    story.given("test cases with adapter-specific statuses (pass, fail, skip)");
    const passingRun = createRawRun({
      testCases: [createPassingTestCase()],
    });
    const failingRun = createRawRun({
      testCases: [createFailingTestCase()],
    });
    const skippedRun = createRawRun({
      testCases: [createSkippedTestCase()],
    });

    story.when("each run is canonicalized");
    const passed = canonicalizeRun(passingRun);
    const failed = canonicalizeRun(failingRun);
    const skipped = canonicalizeRun(skippedRun);

    story.then("statuses are normalized to passed, failed, skipped");
    expect(passed.testCases[0].status).toBe("passed");
    expect(failed.testCases[0].status).toBe("failed");
    expect(skipped.testCases[0].status).toBe("skipped");
  });

  it("derives step-level results from scenario status", ({ task }) => {
    story.init(task);

    story.given("a failing test case with three steps");
    const raw = createRawRun({ testCases: [createFailingTestCase()] });

    story.when("the run is canonicalized");
    const result = canonicalizeRun(raw);
    const tc = result.testCases[0];

    story.then("earlier steps are marked as passed");
    expect(tc.stepResults[0].status).toBe("passed");
    expect(tc.stepResults[1].status).toBe("passed");

    story.and("the last step is marked as failed with an error message");
    expect(tc.stepResults[2].status).toBe("failed");
    expect(tc.stepResults[2].errorMessage).toBeTruthy();
  });

  it("processes a run with multiple test cases of mixed status", ({ task }) => {
    story.init(task);

    story.given("a run containing passed, failed, and skipped test cases");
    const raw = createMultipleTestCasesRun();

    story.when("the run is canonicalized");
    const result = canonicalizeRun(raw);

    story.then("all three test cases are present in the output");
    expect(result.testCases).toHaveLength(3);

    story.and("the run passes validation");
    const validation = validateCanonicalRun(result);
    expect(validation.valid).toBe(true);
  });
});
