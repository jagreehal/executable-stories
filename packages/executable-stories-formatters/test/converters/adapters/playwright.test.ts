import { describe, it, expect } from "vitest";
import { adaptPlaywrightRun } from "../../../src/converters/adapters/playwright";
import type {
  PlaywrightTestCase,
  PlaywrightTestResult,
} from "../../../src/converters/adapters/playwright";

describe("adaptPlaywrightRun", () => {
  it("preserves timeout/interrupted raw statuses", () => {
    const mkTest = (title: string) => ({
      title,
      titlePath: () => ["suite", title],
      annotations: [
        {
          type: "story-meta",
          description: JSON.stringify({
            scenario: title,
            steps: [{ id: "step-0", keyword: "Given", text: "something" }],
          }),
        },
      ],
      location: { file: "spec.ts", line: 1, column: 1 },
      retries: 0,
    });

    const run = adaptPlaywrightRun([
      [mkTest("timeout case"), { status: "timedOut", duration: 1, errors: [], attachments: [], retry: 0 }],
      [mkTest("interrupted case"), { status: "interrupted", duration: 1, errors: [], attachments: [], retry: 0 }],
    ] as Array<[PlaywrightTestCase, PlaywrightTestResult]>);

    expect(run.testCases[0].status).toBe("timeout");
    expect(run.testCases[1].status).toBe("interrupted");
  });

  it("derives stepEvents from story step durations when result.stepEvents is absent", () => {
    const run = adaptPlaywrightRun([
      [
        {
          title: "story",
          titlePath: () => ["suite", "story"],
          annotations: [
            {
              type: "story-meta",
              description: JSON.stringify({
                scenario: "story",
                steps: [
                  { id: "step-0", keyword: "Given", text: "a", durationMs: 11 },
                  { id: "step-1", keyword: "When", text: "b" },
                ],
              }),
            },
          ],
          location: { file: "spec.ts", line: 1, column: 1 },
          retries: 0,
        },
        { status: "passed", duration: 12, errors: [], attachments: [], retry: 0 },
      ],
    ] as Array<[PlaywrightTestCase, PlaywrightTestResult]>);

    expect(run.testCases[0].stepEvents).toEqual([
      { index: 0, stepId: "step-0", title: "a", durationMs: 11 },
    ]);
  });

  it("uses explicit result.stepEvents when provided", () => {
    const run = adaptPlaywrightRun([
      [
        {
          title: "story",
          titlePath: () => ["suite", "story"],
          annotations: [
            {
              type: "story-meta",
              description: JSON.stringify({
                scenario: "story",
                steps: [{ id: "step-0", keyword: "Given", text: "a", durationMs: 11 }],
              }),
            },
          ],
          location: { file: "spec.ts", line: 1, column: 1 },
          retries: 0,
        },
        {
          status: "passed",
          duration: 12,
          errors: [],
          attachments: [],
          retry: 0,
          stepEvents: [{ index: 0, stepId: "step-0", status: "pass", durationMs: 99 }],
        },
      ],
    ] as Array<[PlaywrightTestCase, PlaywrightTestResult]>);

    expect(run.testCases[0].stepEvents).toEqual([
      { index: 0, stepId: "step-0", status: "pass", durationMs: 99 },
    ]);
  });
});
