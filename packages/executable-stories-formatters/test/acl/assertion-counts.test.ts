/**
 * Assertion counts have to survive canonicalization.
 *
 * The count is observed by the adapter and consumed by the review grading at
 * the far end of the pipeline. If the ACL drops it, every scenario silently
 * becomes unobservable and the grading floor never fires.
 */
import { describe, expect, it } from "vitest";
import { canonicalizeRun } from "../../src/index";
import { createRawRun, createRawTestCase, createStoryMeta } from "../stubs";

describe("canonicalizeRun with assertion counts", () => {
  it("carries an observed count through to the canonical run", () => {
    const run = createRawRun({
      testCases: [
        createRawTestCase({
          story: createStoryMeta({
            steps: [
              { keyword: "Given", text: "two numbers 5 and 3", assertions: 0 },
              { keyword: "Then", text: "the result is 8", assertions: 2 },
            ],
          }),
        }),
      ],
    });

    const [testCase] = canonicalizeRun(run).testCases;
    expect(testCase.story.steps.map((s) => s.assertions)).toEqual([0, 2]);
  });

  it("leaves an unobserved step unobserved rather than defaulting it to zero", () => {
    const run = createRawRun({
      testCases: [
        createRawTestCase({
          story: createStoryMeta({
            steps: [{ keyword: "Then", text: "the result is 8" }],
          }),
        }),
      ],
    });

    const [testCase] = canonicalizeRun(run).testCases;
    expect(testCase.story.steps[0].assertions).toBeUndefined();
  });
});
