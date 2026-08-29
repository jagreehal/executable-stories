/**
 * Grading the credibility of a scenario's proof.
 *
 * The ladder already climbs from a passing test up to mutation scores and
 * failing-first verification. These tests pin its bottom rung: a scenario that
 * passed without asserting anything is not weak evidence, it is none.
 */
import { describe, expect, it } from "vitest";
import { gradeEvidence } from "../../src/index";
import { createStoryMeta, createTestCaseResult } from "../stubs";

describe("gradeEvidence", () => {
  it("grades a passing scenario that asserted nothing as none", () => {
    const testCase = createTestCaseResult({
      status: "passed",
      story: createStoryMeta({
        steps: [
          { keyword: "Given", text: "two numbers 5 and 3" },
          { keyword: "Then", text: "the result is 8", assertions: 0 },
        ],
      }),
    });

    expect(gradeEvidence(testCase, "engineer").strength).toBe("none");
  });

  it("ignores assertions made outside the steps that state the claim", () => {
    // Asserting the setup worked is not the same as checking the result. The
    // claim lives in the Then, and the Then checked nothing.
    const testCase = createTestCaseResult({
      status: "passed",
      story: createStoryMeta({
        steps: [
          { keyword: "Given", text: "two numbers 5 and 3", assertions: 1 },
          { keyword: "When", text: "they are added", assertions: 2 },
          { keyword: "Then", text: "the result is 8", assertions: 0 },
        ],
      }),
    });

    expect(gradeEvidence(testCase, "engineer").strength).toBe("none");
  });

  it("leaves a scenario ungraded when the adapter cannot observe assertions", () => {
    // Go, Rust, pytest, JUnit 5 and xUnit have no assertion counter to read.
    // Absent must stay absent: reading it as zero would accuse every scenario
    // in those languages of proving nothing.
    const testCase = createTestCaseResult({
      status: "passed",
      story: createStoryMeta({
        steps: [
          { keyword: "Given", text: "two numbers 5 and 3" },
          { keyword: "Then", text: "the result is 8" },
        ],
      }),
    });

    expect(gradeEvidence(testCase, "engineer").strength).toBe("weak");
  });
});