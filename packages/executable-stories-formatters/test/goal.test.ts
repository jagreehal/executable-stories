import { describe, it, expect, beforeEach } from "vitest";
import { buildGoal, ratchet, renderGoal } from "../src/goal";
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

  it("ratchet catches a green scenario that now makes fewer assertions with the same steps", () => {
    const steps = (assertions: number) => [
      { keyword: "Given" as const, text: "a cart" },
      { keyword: "Then" as const, text: "the total is £30", assertions },
    ];
    const baseline = stubs.testRunResult({
      testCases: [tc({ id: "total", status: "passed", sourceFile: "cart.story.test.ts", sourceLine: 4, story: stubs.storyMeta({ scenario: "Total", steps: steps(2) }) })],
    });
    const run = (status: "passed" | "failed") =>
      stubs.testRunResult({
        testCases: [tc({ id: "total", status, sourceFile: "cart.story.test.ts", sourceLine: 4, story: stubs.storyMeta({ scenario: "Total", steps: steps(1) }) })],
      });

    expect(ratchet(baseline, run("passed")).violations).toEqual([
      { id: "total", title: "Total", kind: "weakened", detail: "2 assertions -> 1 assertion", sourceFile: "cart.story.test.ts", sourceLine: 4 },
    ]);
    // A red run stops at the failure, so its short count is not weakening.
    expect(ratchet(baseline, run("failed")).violations).toEqual([]);
  });

  it("ratchet does not count assertions an adapter could not observe", () => {
    const baseline = stubs.testRunResult({
      testCases: [tc({ id: "a", status: "passed", story: stubs.storyMeta({ scenario: "A", steps: [{ keyword: "Then", text: "y", assertions: 3 }] }) })],
    });
    const run = stubs.testRunResult({
      testCases: [tc({ id: "a", status: "passed", story: stubs.storyMeta({ scenario: "A", steps: [{ keyword: "Then", text: "y" }] }) })],
    });
    expect(ratchet(baseline, run).violations).toEqual([]);
  });

  it("ratchet follows a renamed scenario instead of reporting it removed", () => {
    const steps = [
      { keyword: "Given" as const, text: "a signed-in user" },
      { keyword: "When" as const, text: "they open settings" },
      { keyword: "Then" as const, text: "they see their email", assertions: 2 },
    ];
    const baseline = stubs.testRunResult({
      testCases: [tc({ id: "old", status: "passed", sourceFile: "settings.story.test.ts", story: stubs.storyMeta({ scenario: "Settings shows email", steps }) })],
    });
    const run = stubs.testRunResult({
      testCases: [tc({ id: "new", status: "passed", sourceFile: "settings.story.test.ts", story: stubs.storyMeta({ scenario: "Settings page shows the email", steps }) })],
    });
    expect(ratchet(baseline, run).violations).toEqual([]);
  });

  it("a filtered run's missing scenarios are unchecked, not removed; a skip in it still counts; an incomplete file blocks the goal", () => {
    const steps = [{ keyword: "Given" as const, text: "x" }];
    const baseline = stubs.testRunResult({
      testCases: [
        tc({ id: "untouched", sourceFile: "src/a.test.ts", status: "passed", story: stubs.storyMeta({ scenario: "Untouched", steps }) }),
        tc({ id: "target", sourceFile: "src/b.test.ts", status: "passed", story: stubs.storyMeta({ scenario: "Target", steps }) }),
        tc({ id: "broken", sourceFile: "src/c.test.ts", status: "passed", story: stubs.storyMeta({ scenario: "Broken", steps }) }),
      ],
    });
    const goal = (over: Partial<Parameters<typeof stubs.testRunResult>[0]>) =>
      buildGoal({
        run: stubs.testRunResult({ testCases: [tc({ id: "target", sourceFile: "src/b.test.ts", status: "skipped", story: stubs.storyMeta({ scenario: "Target", steps }) })], ...over }),
        baseline,
        requireTags: [],
        requireTickets: [],
        requireScenarios: [],
        enforceNoRegressions: false,
        enforceRatchet: true,
        format: "text",
      });

    const filtered = goal({ runScope: "filtered" });
    expect(filtered.ratchet.violations.map((v) => v.kind)).toEqual(["disabled"]);
    expect(filtered.ratchet.unchecked.map((u) => u.id)).toEqual(["untouched", "broken"]);
    expect(renderGoal(filtered, "text")).toContain("not checked for removal: 2");
    expect(filtered.incompleteFiles).toEqual([]);
    expect(filtered.met).toBe(false);

    const full = goal({ runScope: "full", incompleteSourceFiles: ["src/c.test.ts"] });
    expect(full.ratchet.violations.map((v) => `${v.kind}:${v.id}`).sort()).toEqual(["disabled:target", "removed:untouched"]);
    expect(full.ratchet.unchecked.map((u) => u.id)).toEqual(["broken"]);
    expect(full.incompleteFiles).toEqual(["src/c.test.ts"]);
    expect(renderGoal(full, "text")).toContain("incomplete: 1 file(s) failed before declaring scenarios (src/c.test.ts)");

    // Even with every requirement met and nothing removed, a broken file is not done.
    const onlyBroken = buildGoal({
      run: stubs.testRunResult({ testCases: [tc({ status: "passed" })], incompleteSourceFiles: ["src/c.test.ts"] }),
      requireTags: [],
      requireTickets: [],
      requireScenarios: [],
      enforceNoRegressions: false,
      enforceRatchet: false,
      format: "text",
    });
    expect(onlyBroken.met).toBe(false);
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
