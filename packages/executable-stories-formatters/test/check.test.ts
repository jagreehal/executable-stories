import { describe, it, expect, beforeEach } from "vitest";
import { buildCheck, renderCheck } from "../src/check";
import { stubs } from "./stubs";
import type { TestStatus } from "../src/index";

describe("buildCheck", () => {
  beforeEach(() => {
    stubs.setFakerSeed(42);
  });

  it("compresses passing scenarios to a summary line", () => {
    const passing = Array.from({ length: 3 }, () =>
      stubs.testCaseResult({ status: "passed" }),
    );

    const report = buildCheck({ testCases: passing, format: "text" }, {});

    expect(report.summary).toMatchObject({ total: 3, passed: 3, failed: 0 });
    expect(report.failures).toEqual([]);

    const text = renderCheck(report, "text");
    expect(text).toContain("3 passed");
    expect(text).toContain("All scenarios green.");
    // Compressed: no per-scenario detail for passing runs.
    expect(text.split("\n").length).toBeLessThanOrEqual(2);
  });

  it("expands a failing scenario with steps, failing-step marker, error, and covers", () => {
    const failed = stubs.testCaseResult({
      id: "f1",
      status: "failed",
      sourceFile: "src/auth/session.story.test.ts",
      sourceLine: 31,
      errorMessage: "scenario-level fallback",
      story: stubs.storyMeta({
        scenario: "Expired session redirects to login",
        covers: ["src/auth/session.ts", "src/middleware/auth.ts"],
        tickets: [{ id: "AUTH-123" }],
        steps: [
          { id: "s0", keyword: "Given", text: "an expired session" },
          { id: "s1", keyword: "When", text: "the user opens /dashboard" },
          { id: "s2", keyword: "Then", text: "they are redirected to /login" },
        ],
      }),
      tags: [],
      stepResults: [
        { index: 0, stepId: "s0", status: "passed", durationMs: 1 },
        { index: 1, stepId: "s1", status: "passed", durationMs: 1 },
        {
          index: 2,
          stepId: "s2",
          status: "failed",
          durationMs: 1,
          errorMessage: "expected redirect to /login, received 200",
        },
      ],
    });

    const report = buildCheck({ testCases: [failed], format: "text" }, {});
    expect(report.failures).toHaveLength(1);

    const f = report.failures[0];
    expect(f.location).toBe("src/auth/session.story.test.ts:31");
    expect(f.covers).toEqual(["src/auth/session.ts", "src/middleware/auth.ts"]);
    expect(f.tickets).toEqual(["AUTH-123"]);
    // Prefers the failing step's message over the scenario-level fallback.
    expect(f.errorMessage).toBe("expected redirect to /login, received 200");
    expect(f.steps.find((s) => s.text === "they are redirected to /login")?.failed).toBe(true);
    expect(f.steps.find((s) => s.text === "an expired session")?.failed).toBe(false);

    const text = renderCheck(report, "text");
    expect(text).toContain("Expired session redirects to login");
    expect(text).toContain("Given an expired session");
    expect(text).toContain("→ expected redirect to /login, received 200");
    expect(text).toContain("covers: src/auth/session.ts, src/middleware/auth.ts");
    expect(text).toContain("ticket: AUTH-123");
  });

  it("falls back to the scenario error when no step is isolated", () => {
    const failed = stubs.testCaseResult({
      status: "failed",
      errorMessage: "TypeError: cannot read property 'id' of undefined",
      story: stubs.storyMeta({
        scenario: "Setup throws",
        steps: [{ id: "s0", keyword: "Given", text: "a broken fixture" }],
      }),
      stepResults: [{ index: 0, stepId: "s0", status: "passed", durationMs: 1 }],
    });

    const report = buildCheck({ testCases: [failed], format: "text" }, {});
    expect(report.failures[0].errorMessage).toBe(
      "TypeError: cannot read property 'id' of undefined",
    );
  });

  it("reports regressed and fixed counts against a baseline", () => {
    const stillPassing = stubs.testCaseResult({ id: "a", status: "passed", story: stubs.storyMeta({ scenario: "A", steps: [] }) });
    const regressed = stubs.testCaseResult({ id: "b", status: "failed", story: stubs.storyMeta({ scenario: "B", steps: [] }), stepResults: [] });
    const fixed = stubs.testCaseResult({ id: "c", status: "passed", story: stubs.storyMeta({ scenario: "C", steps: [] }) });

    const baseline = new Map<string, TestStatus>([
      ["a", "passed"],
      ["b", "passed"], // was passing, now failing → regressed
      ["c", "failed"], // was failing, now passing → fixed
    ]);

    const report = buildCheck(
      { testCases: [stillPassing, regressed, fixed], baseline, format: "text" },
      {},
    );

    expect(report.comparedToBaseline).toBe(true);
    expect(report.regressed).toBe(1);
    expect(report.fixed).toBe(1);
    expect(report.failures[0].regressed).toBe(true);

    const text = renderCheck(report, "text");
    expect(text).toContain("1 regressed since baseline");
    expect(text).toContain("1 fixed since baseline");
  });

  it("orders regressions before other failures", () => {
    const baselineFailing = stubs.testCaseResult({
      id: "old",
      status: "failed",
      sourceFile: "a.test.ts",
      sourceLine: 1,
      story: stubs.storyMeta({ scenario: "Already broken", steps: [] }),
      stepResults: [],
    });
    const newlyBroken = stubs.testCaseResult({
      id: "new",
      status: "failed",
      sourceFile: "z.test.ts",
      sourceLine: 1,
      story: stubs.storyMeta({ scenario: "Just broke", steps: [] }),
      stepResults: [],
    });

    const baseline = new Map<string, TestStatus>([
      ["old", "failed"],
      ["new", "passed"],
    ]);

    const report = buildCheck(
      { testCases: [baselineFailing, newlyBroken], baseline, format: "text" },
      {},
    );

    expect(report.failures[0].scenario).toBe("Just broke");
    expect(report.failures[0].regressed).toBe(true);
  });

  it("emits structured JSON", () => {
    const failed = stubs.testCaseResult({
      id: "f1",
      status: "failed",
      story: stubs.storyMeta({ scenario: "Boom", steps: [], covers: ["src/x.ts"] }),
      stepResults: [],
      errorMessage: "kaboom",
    });

    const report = buildCheck({ testCases: [failed], format: "json" }, {});
    const parsed = JSON.parse(renderCheck(report, "json"));

    expect(parsed.summary).toMatchObject({ total: 1, failed: 1 });
    expect(parsed.failures[0]).toMatchObject({
      id: "f1",
      scenario: "Boom",
      covers: ["src/x.ts"],
      errorMessage: "kaboom",
    });
  });

  it("names turned-off scenarios and does not call the run green", () => {
    const off = stubs.testCaseResult({
      id: "off1",
      status: "skipped",
      sourceFile: "src/billing/refund.story.test.ts",
      sourceLine: 12,
      story: stubs.storyMeta({ scenario: "Refund a part-used subscription", tickets: [] }),
    });
    const offWithTicket = stubs.testCaseResult({
      id: "off2",
      status: "skipped",
      sourceFile: "src/auth/lockout.story.test.ts",
      sourceLine: 8,
      story: stubs.storyMeta({
        scenario: "Lock the account after five bad passwords",
        tickets: [{ id: "AUTH-9" }],
      }),
    });
    // it.todo is a planned spec, not a switched-off one.
    const planned = stubs.testCaseResult({
      id: "todo1",
      status: "pending",
      rawStatus: "todo",
      story: stubs.storyMeta({ scenario: "Split a refund across two cards" }),
    });

    const report = buildCheck(
      { testCases: [stubs.testCaseResult({ status: "passed" }), off, offWithTicket, planned], format: "text" },
      {},
    );

    expect(report.turnedOff.map((t) => t.id)).toEqual(["off2", "off1"]);

    const text = renderCheck(report, "text");
    expect(text).toContain("All running scenarios green.");
    expect(text).not.toContain("All scenarios green.");
    expect(text).toContain("2 turned off (not validated)");
    expect(text).toContain("Refund a part-used subscription");
    expect(text).toContain("no ticket");
    expect(text).toContain("ticket: AUTH-9");
    expect(text).not.toContain("Split a refund across two cards");
  });

  it("handles an empty run", () => {
    const report = buildCheck({ testCases: [], format: "text" }, {});
    expect(report.summary.total).toBe(0);
    expect(renderCheck(report, "text")).toContain("All scenarios green.");
  });
});
