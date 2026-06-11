import { describe, it, expect, beforeEach } from "vitest";
import { buildGoal, renderGoal } from "../src/goal";
import { stubs } from "./stubs";

function tc(over: Parameters<typeof stubs.testCaseResult>[0]) {
  return stubs.testCaseResult(over);
}

describe("buildGoal", () => {
  beforeEach(() => stubs.setFakerSeed(7));

  it("is met when every scenario passes and no selectors are given", () => {
    const run = stubs.testRunResult({
      testCases: [tc({ status: "passed" }), tc({ status: "passed" })],
    });
    const report = buildGoal({
      run,
      requireTags: [],
      requireTickets: [],
      requireScenarios: [],
      enforceNoRegressions: false,
      enforceRatchet: false,
      format: "text",
    });
    expect(report.met).toBe(true);
    expect(report.requirements[0].selector).toBe("all scenarios");
  });

  it("is not met when a required tag has a failing scenario", () => {
    const run = stubs.testRunResult({
      testCases: [
        tc({ status: "passed", tags: ["US-101"], story: stubs.storyMeta({ scenario: "A", tags: ["US-101"], steps: [] }) }),
        tc({ status: "failed", tags: ["US-101"], story: stubs.storyMeta({ scenario: "B", tags: ["US-101"], steps: [] }) }),
        tc({ status: "passed", tags: ["other"], story: stubs.storyMeta({ scenario: "C", tags: ["other"], steps: [] }) }),
      ],
    });
    const report = buildGoal({
      run,
      requireTags: ["US-101"],
      requireTickets: [],
      requireScenarios: [],
      enforceNoRegressions: false,
      enforceRatchet: false,
      format: "text",
    });
    expect(report.met).toBe(false);
    const req = report.requirements[0];
    expect(req).toMatchObject({ selector: "tag:US-101", matched: 2, passed: 1, met: false });
    expect(req.failing).toEqual(["B"]);
  });

  it("is not met when a required selector matches no scenario (no proof)", () => {
    const run = stubs.testRunResult({ testCases: [tc({ status: "passed" })] });
    const report = buildGoal({
      run,
      requireTags: [],
      requireTickets: ["US-999"],
      requireScenarios: [],
      enforceNoRegressions: false,
      enforceRatchet: false,
      format: "text",
    });
    expect(report.met).toBe(false);
    expect(report.requirements[0].matched).toBe(0);
    expect(renderGoal(report, "text")).toContain("no matching scenario (no proof)");
  });

  it("flags regressions against baseline when enforced", () => {
    const run = stubs.testRunResult({
      testCases: [tc({ id: "a", status: "failed", story: stubs.storyMeta({ scenario: "A", steps: [] }) })],
    });
    const baseline = stubs.testRunResult({
      testCases: [tc({ id: "a", status: "passed", story: stubs.storyMeta({ scenario: "A", steps: [] }) })],
    });
    const report = buildGoal({
      run,
      baseline,
      requireTags: [],
      requireTickets: [],
      requireScenarios: [],
      enforceNoRegressions: true,
      enforceRatchet: false,
      format: "text",
    });
    expect(report.met).toBe(false);
    expect(report.regressions).toEqual([{ id: "a", title: "A" }]);
  });

  it("ratchet catches removed, disabled, and weakened scenarios", () => {
    const baseline = stubs.testRunResult({
      testCases: [
        tc({ id: "removed", status: "passed", story: stubs.storyMeta({ scenario: "Removed", steps: [{ keyword: "Given", text: "x" }] }) }),
        tc({ id: "disabled", status: "passed", story: stubs.storyMeta({ scenario: "Disabled", steps: [{ keyword: "Given", text: "x" }] }) }),
        tc({ id: "weak", status: "passed", story: stubs.storyMeta({ scenario: "Weak", steps: [{ keyword: "Given", text: "x" }, { keyword: "Then", text: "y" }] }) }),
      ],
    });
    const run = stubs.testRunResult({
      testCases: [
        // "removed" is gone
        tc({ id: "disabled", status: "skipped", story: stubs.storyMeta({ scenario: "Disabled", steps: [{ keyword: "Given", text: "x" }] }) }),
        tc({ id: "weak", status: "passed", story: stubs.storyMeta({ scenario: "Weak", steps: [{ keyword: "Given", text: "x" }] }) }),
      ],
    });
    const report = buildGoal({
      run,
      baseline,
      requireTags: [],
      requireTickets: [],
      requireScenarios: [],
      enforceNoRegressions: false,
      enforceRatchet: true,
      format: "text",
    });
    expect(report.met).toBe(false);
    const kinds = report.ratchet.violations.map((v) => v.kind).sort();
    expect(kinds).toEqual(["disabled", "removed", "weakened"]);
  });

  it("renders a met verdict", () => {
    const run = stubs.testRunResult({ testCases: [tc({ status: "passed" })] });
    const report = buildGoal({
      run,
      requireTags: [],
      requireTickets: [],
      requireScenarios: [],
      enforceNoRegressions: false,
      enforceRatchet: false,
      format: "text",
    });
    expect(renderGoal(report, "text")).toContain("GOAL: met");
  });
});
