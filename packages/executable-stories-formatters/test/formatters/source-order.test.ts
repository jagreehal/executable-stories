import { describe, it, expect } from "vitest";
import { MarkdownFormatter } from "../../src/formatters/markdown";
import { ConfluenceFormatter } from "../../src/formatters/confluence";
import { bySourcePosition } from "../../src/formatters/source-order";
import type { TestCaseResult, TestRunResult } from "executable-stories-core";

/**
 * Playwright's `fullyParallel` spreads a file across workers, so `story.init()`
 * fires in completion order and each worker restarts its own counter at zero.
 * Ordering on that counter shuffled the report and could reorder a document
 * because someone added a worker. `sourceLine` is where the test actually is.
 */

interface Opts {
  line: number;
  order?: number;
  file?: string;
  suite?: string;
}

const scenario = (name: string, opts: Opts): TestCaseResult => ({
  id: `${opts.file ?? "e2e/conformance.spec.ts"}:${opts.line}`,
  story: { scenario: name, steps: [], sourceOrder: opts.order },
  sourceFile: opts.file ?? "e2e/conformance.spec.ts",
  sourceLine: opts.line,
  status: "passed",
  durationMs: 0,
  attachments: [],
  stepResults: [],
  titlePath: opts.suite ? [opts.suite] : [],
  tags: [],
  tickets: [],
});

const run = (testCases: TestCaseResult[]): TestRunResult => ({
  testCases,
  startedAtMs: 0,
  finishedAtMs: 0,
  durationMs: 0,
  projectRoot: "/repo",
  runId: "run-1",
});

/**
 * Scenario names in the order the document renders them. Markdown emits
 * headings and Confluence emits ADF JSON, so match the names themselves and
 * keep first occurrences — the fixtures carry no steps or tags to collide with.
 */
const rendered = (out: string): string[] => {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const [name] of out.matchAll(/scenario (?:first|second|third|fourth)/g)) {
    if (seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
};

/**
 * The real shape of the bug: three tests declared at ascending lines, finishing
 * out of order across two workers, so worker B's counter repeats worker A's.
 */
const parallelRun = () =>
  run([
    scenario("scenario second", { line: 36, order: 0 }),
    scenario("scenario first", { line: 21, order: 1 }),
    scenario("scenario third", { line: 48, order: 0 }),
  ]);

const inSourceOrder = ["scenario first", "scenario second", "scenario third"];

describe("source ordering", () => {
  it("orders markdown scenarios by source line, not execution order", () => {
    const out = new MarkdownFormatter({ sortScenarios: "source" }).format(
      parallelRun(),
    );
    expect(rendered(out)).toEqual(inSourceOrder);
  });

  it("orders confluence scenarios the same way", () => {
    const out = new ConfluenceFormatter({ sortScenarios: "source" }).format(
      parallelRun(),
    );
    expect(rendered(out)).toEqual(inSourceOrder);
  });

  it("orders suite groups by their earliest source line", () => {
    // The later suite finishes first, so execution order inverts the file.
    const out = new MarkdownFormatter({ sortScenarios: "source" }).format(
      run([
        scenario("scenario third", { line: 90, order: 0, suite: "Checkout" }),
        scenario("scenario fourth", { line: 99, order: 1, suite: "Checkout" }),
        scenario("scenario first", { line: 10, order: 2, suite: "Cart" }),
        scenario("scenario second", { line: 20, order: 3, suite: "Cart" }),
      ]),
    );
    expect(out.indexOf("Cart")).toBeLessThan(out.indexOf("Checkout"));
    expect(rendered(out)).toEqual([
      "scenario first",
      "scenario second",
      "scenario third",
      "scenario fourth",
    ]);
  });

  it("is stable across runs that report the same lines in different orders", () => {
    const format = (r: TestRunResult) =>
      rendered(new MarkdownFormatter({ sortScenarios: "source" }).format(r));
    const shuffled = run([...parallelRun().testCases].reverse());
    expect(format(shuffled)).toEqual(format(parallelRun()));
  });

  it("still sorts alphabetically when asked", () => {
    const out = new MarkdownFormatter({ sortScenarios: "alpha" }).format(
      parallelRun(),
    );
    expect(rendered(out)).toEqual([
      "scenario first",
      "scenario second",
      "scenario third",
    ]);
  });

  it("leaves order untouched when sorting is off", () => {
    const out = new MarkdownFormatter({ sortScenarios: "none" }).format(
      parallelRun(),
    );
    expect(rendered(out)).toEqual([
      "scenario second",
      "scenario first",
      "scenario third",
    ]);
  });
});

describe("bySourcePosition", () => {
  it("separates two files that share a line number", () => {
    const a = scenario("scenario a", { line: 12, file: "e2e/a.spec.ts" });
    const b = scenario("scenario b", { line: 12, file: "e2e/b.spec.ts" });
    expect(bySourcePosition(a, b)).toBeLessThan(0);
    expect(bySourcePosition(b, a)).toBeGreaterThan(0);
  });

  it("falls back to the init counter for two tests on one line", () => {
    // `test.each` generates several cases from a single declaration, so the
    // line genuinely repeats and the counter is the only thing left.
    const first = scenario("scenario a", { line: 12, order: 0 });
    const second = scenario("scenario b", { line: 12, order: 1 });
    expect(bySourcePosition(first, second)).toBeLessThan(0);
  });

  it("treats a missing counter as zero rather than throwing", () => {
    const a = scenario("scenario a", { line: 12 });
    const b = scenario("scenario b", { line: 12 });
    expect(bySourcePosition(a, b)).toBe(0);
  });
});
