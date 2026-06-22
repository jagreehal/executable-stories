import { describe, expect, it } from "vitest";

import {
  advanceState,
  computeDeltas,
  injectLiveBits,
  renderDeltaStrip,
  type RunState,
} from "../src/serve";
import type { TestCaseResult, TestRunResult, TestStatus } from "../src/types/test-result";

/** Minimal test case carrying just the fields the compare engine reads. */
function tc(id: string, status: TestStatus, scenario = id): TestCaseResult {
  return {
    id,
    story: { scenario, steps: [], docs: [], covers: [], tickets: [] },
    sourceFile: `src/${id}.test.ts`,
    sourceLine: 1,
    status,
    durationMs: 1,
    attachments: [],
    stepResults: [],
    titlePath: [scenario],
    tags: [],
  } as unknown as TestCaseResult;
}

function run(cases: TestCaseResult[]): TestRunResult {
  return { testCases: cases } as unknown as TestRunResult;
}

const EMPTY: RunState = {
  sessionBaseline: null,
  previous: null,
  current: null,
  runCount: 0,
};

describe("advanceState", () => {
  it("pins the session baseline on the first run", () => {
    const first = run([tc("a", "failed")]);
    const s = advanceState(EMPTY, first);
    expect(s.sessionBaseline).toBe(first);
    expect(s.previous).toBeNull();
    expect(s.current).toBe(first);
    expect(s.runCount).toBe(1);
  });

  it("keeps the baseline fixed and shifts previous/current forward", () => {
    const first = run([tc("a", "failed")]);
    const second = run([tc("a", "passed")]);
    const third = run([tc("a", "passed")]);

    const s2 = advanceState(advanceState(EMPTY, first), second);
    expect(s2.sessionBaseline).toBe(first);
    expect(s2.previous).toBe(first);
    expect(s2.current).toBe(second);
    expect(s2.runCount).toBe(2);

    const s3 = advanceState(s2, third);
    expect(s3.sessionBaseline).toBe(first); // still anchored to the loop start
    expect(s3.previous).toBe(second);
    expect(s3.current).toBe(third);
    expect(s3.runCount).toBe(3);
  });
});

describe("computeDeltas", () => {
  it("returns null diffs until there are two runs", () => {
    expect(computeDeltas(EMPTY)).toEqual({ session: null, iteration: null });
    const one = advanceState(EMPTY, run([tc("a", "failed")]));
    expect(computeDeltas(one)).toEqual({ session: null, iteration: null });
  });

  it("diffs the session against the baseline and the iteration against the previous run", () => {
    const first = run([tc("a", "failed"), tc("b", "failed")]);
    const second = run([tc("a", "passed"), tc("b", "failed")]);
    const third = run([tc("a", "passed"), tc("b", "passed")]);
    const state = advanceState(advanceState(advanceState(EMPTY, first), second), third);

    const { session, iteration } = computeDeltas(state);
    expect(session?.summary.fixed).toBe(2); // vs the loop start: both now pass
    expect(iteration?.summary.fixed).toBe(1); // vs the previous run: only b flipped
  });
});

describe("renderDeltaStrip", () => {
  it("shows a baseline-pinned message on the first run", () => {
    const s = advanceState(EMPTY, run([tc("a", "failed")]));
    const html = renderDeltaStrip(s);
    expect(html).toContain("baseline pinned");
    expect(html).toContain("data-es-live");
  });

  it("reports fixed behaviours against the session baseline", () => {
    const first = run([tc("a", "failed"), tc("b", "failed")]);
    const second = run([tc("a", "passed"), tc("b", "failed")]);
    const s = advanceState(advanceState(EMPTY, first), second);
    const html = renderDeltaStrip(s);
    expect(html).toContain("since you started: +1 passing");
    expect(html).toContain("run #2");
  });

  it("reports a regression against the session baseline", () => {
    const first = run([tc("a", "passed")]);
    const second = run([tc("a", "failed")]);
    const s = advanceState(advanceState(EMPTY, first), second);
    expect(renderDeltaStrip(s)).toContain("1 regressed");
  });

  it("surfaces the per-iteration delta separately from the session total", () => {
    const first = run([tc("a", "failed"), tc("b", "failed")]);
    const second = run([tc("a", "passed"), tc("b", "failed")]);
    const third = run([tc("a", "passed"), tc("b", "passed")]);
    const s = advanceState(advanceState(advanceState(EMPTY, first), second), third);
    const html = renderDeltaStrip(s);
    expect(html).toContain("since you started: +2 passing");
    expect(html).toContain("this iteration: +1 passing");
  });
});

describe("injectLiveBits", () => {
  it("inserts the strip after <body> and the reload client before </body>", () => {
    const out = injectLiveBits("<html><body><h1>Report</h1></body></html>", "<div>STRIP</div>");
    expect(out).toContain("<body><div>STRIP</div>");
    expect(out).toContain("EventSource");
    expect(out.indexOf("STRIP")).toBeLessThan(out.indexOf("</body>"));
    expect(out.indexOf("EventSource")).toBeLessThan(out.indexOf("</body>"));
  });

  it("falls back gracefully when there is no body tag", () => {
    const out = injectLiveBits("<h1>x</h1>", "<div>STRIP</div>");
    expect(out.startsWith("<div>STRIP</div>")).toBe(true);
    expect(out).toContain("EventSource");
  });
});
