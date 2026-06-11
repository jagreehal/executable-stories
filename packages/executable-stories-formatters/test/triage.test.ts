import { describe, it, expect, beforeEach } from "vitest";
import { buildTriage, renderTriage } from "../src/triage";
import { stubs } from "./stubs";
import type { TestStatus } from "../src/index";

describe("buildTriage", () => {
  beforeEach(() => stubs.setFakerSeed(11));

  it("lists only failing scenarios, regressions first, with covers", () => {
    const tcs = [
      stubs.testCaseResult({ id: "p", status: "passed", story: stubs.storyMeta({ scenario: "Passing", steps: [] }) }),
      stubs.testCaseResult({
        id: "old",
        status: "failed",
        sourceFile: "z.test.ts",
        sourceLine: 1,
        story: stubs.storyMeta({ scenario: "Already broken", steps: [], covers: ["src/z.ts"] }),
        stepResults: [],
      }),
      stubs.testCaseResult({
        id: "new",
        status: "failed",
        sourceFile: "a.test.ts",
        sourceLine: 1,
        story: stubs.storyMeta({ scenario: "Just broke", steps: [], covers: ["src/a.ts"], tickets: [{ id: "US-9" }] }),
        stepResults: [],
      }),
    ];
    const baseline = new Map<string, TestStatus>([
      ["old", "failed"],
      ["new", "passed"], // regressed
    ]);

    const report = buildTriage({ testCases: tcs, baseline, format: "text" });

    expect(report.total).toBe(3);
    expect(report.failing).toBe(2);
    expect(report.regressions).toBe(1);
    // regression ranked first
    expect(report.items[0]).toMatchObject({ rank: 1, scenario: "Just broke", regressed: true, reason: "regression", covers: ["src/a.ts"], tickets: ["US-9"] });
    expect(report.items[1]).toMatchObject({ rank: 2, scenario: "Already broken", regressed: false });
  });

  it("counts and flags failing scenarios with no covers", () => {
    const tcs = [
      stubs.testCaseResult({ id: "x", status: "failed", story: stubs.storyMeta({ scenario: "No covers", steps: [] }), stepResults: [] }),
    ];
    const report = buildTriage({ testCases: tcs, format: "text" });
    expect(report.needsCovers).toBe(1);
    expect(renderTriage(report, "text")).toContain("no covers declared");
  });

  it("uses the failing step's error message when present", () => {
    const tcs = [
      stubs.testCaseResult({
        id: "e",
        status: "failed",
        errorMessage: "scenario fallback",
        story: stubs.storyMeta({ scenario: "Has step error", steps: [{ id: "s0", keyword: "Then", text: "ok" }] }),
        stepResults: [{ index: 0, stepId: "s0", status: "failed", durationMs: 1, errorMessage: "precise step error" }],
      }),
    ];
    const report = buildTriage({ testCases: tcs, format: "json" });
    expect(report.items[0].errorMessage).toBe("precise step error");
  });

  it("reports nothing to triage when all pass", () => {
    const tcs = [stubs.testCaseResult({ status: "passed" })];
    const report = buildTriage({ testCases: tcs, format: "text" });
    expect(report.items).toEqual([]);
    expect(renderTriage(report, "text")).toBe("Nothing to triage. No failing scenarios.");
  });
});
