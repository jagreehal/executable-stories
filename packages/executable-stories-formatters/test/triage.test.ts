import { describe, it, expect, beforeEach } from "vitest";
import { buildTriage, renderTriage } from "../src/triage";
import { parseCodeowners } from "../src/codeowners";
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

describe("buildTriage --by-owner", () => {
  beforeEach(() => stubs.setFakerSeed(11));

  const owners = parseCodeowners(`
/src/checkout/  @acme/payments
/src/search/    @acme/search
`);

  const failing = [
    stubs.testCaseResult({
      id: "cart",
      status: "failed",
      sourceFile: "tests/checkout.story.test.ts",
      sourceLine: 4,
      story: stubs.storyMeta({ scenario: "Cart totals", steps: [], covers: ["src/checkout/cart.ts"] }),
      stepResults: [],
    }),
    stubs.testCaseResult({
      id: "rank",
      status: "failed",
      sourceFile: "src/search/rank.story.test.ts",
      sourceLine: 7,
      story: stubs.storyMeta({ scenario: "Ranking", steps: [], covers: [] }),
      stepResults: [],
    }),
    stubs.testCaseResult({
      id: "orphan",
      status: "failed",
      sourceFile: "tests/misc.story.test.ts",
      sourceLine: 2,
      story: stubs.storyMeta({ scenario: "Nobody's", steps: [], covers: ["src/misc/thing.ts"] }),
      stepResults: [],
    }),
  ];

  it("routes a failure by the code it covers, which is where the fix lands", () => {
    const report = buildTriage({ testCases: failing, format: "text", codeowners: owners });
    expect(report.items.find((i) => i.id === "cart")!.owners).toEqual(["@acme/payments"]);
  });

  it("falls back to the test file when a scenario declares no covers", () => {
    const report = buildTriage({ testCases: failing, format: "text", codeowners: owners });
    expect(report.items.find((i) => i.id === "rank")!.owners).toEqual(["@acme/search"]);
  });

  it("leaves an unclaimed failure unowned rather than guessing a team", () => {
    const report = buildTriage({ testCases: failing, format: "text", codeowners: owners });
    expect(report.items.find((i) => i.id === "orphan")!.owners).toEqual([]);
  });

  it("assigns no owners at all when the repo has no CODEOWNERS", () => {
    const report = buildTriage({ testCases: failing, format: "text" });
    expect(report.items.every((i) => i.owners.length === 0)).toBe(true);
  });

  it("groups the text worklist under each owner, unowned work last", () => {
    const report = buildTriage({ testCases: failing, format: "text", codeowners: owners });
    const text = renderTriage(report, "text", { byOwner: true });
    expect(text).toContain("@acme/payments (1)");
    expect(text).toContain("@acme/search (1)");
    expect(text.indexOf("Unowned (1)")).toBeGreaterThan(text.indexOf("@acme/payments (1)"));
  });
});
