/**
 * A failed assertion's expected/actual values travel from the raw run to the
 * failing step of the StoryReport, and both schemas accept them.
 */
import { canonicalizeRun } from "executable-stories-core/converters/acl/canonicalize";
import { toStoryReport } from "executable-stories-core/converters/story-report";
import { describe, expect, it } from "vitest";

import { validateRawRun } from "../../src/validation/schema-validator";
import { validateStoryReport } from "../../src/validation/story-report-validator";

const raw = {
  schemaVersion: 1,
  testCases: [
    {
      title: "replicas stay available",
      titlePath: ["replicas stay available"],
      story: {
        scenario: "replicas stay available",
        steps: [
          { keyword: "Given", text: "version 2026.09.19 is deployed" },
          { keyword: "Then", text: "at least 3 replicas are available" },
        ],
      },
      sourceFile: "src/deploy.story.test.ts",
      sourceLine: 1,
      status: "fail",
      durationMs: 1,
      error: { message: "expected 2 to be 3", expected: "3", actual: "2" },
    },
  ],
  projectRoot: "/repo",
  startedAtMs: 0,
  finishedAtMs: 1,
};

describe("assertion expected/actual", () => {
  it("is accepted by the raw-run schema", () => {
    expect(validateRawRun(raw).valid).toBe(true);
  });

  it("lands on the failing step of a valid StoryReport", () => {
    const report = toStoryReport(canonicalizeRun(raw as Parameters<typeof canonicalizeRun>[0]));
    const [given, then] = report.features[0].scenarios[0].steps;
    expect(then).toMatchObject({ status: "failed", expected: "3", actual: "2" });
    expect(given).not.toHaveProperty("expected");
    expect(validateStoryReport(report)).toEqual({ valid: true, errors: [] });
  });
});
