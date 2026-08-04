/**
 * Planned scenarios: a bodyless `it("title")` is Mocha's way of writing down
 * behaviour that does not exist yet. It reaches the report as status "todo".
 */
import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import createReporter from "../reporter";
import { recordMeta, clearStore } from "../store";

const SPEC = "cypress/e2e/checkout.cy.ts";

interface FakeTest {
  title: string;
  state?: string;
  duration?: number;
  pending?: boolean;
  fn?: unknown;
  parent?: unknown;
}

/** Minimal stand-in for the Mocha runner Cypress hands the reporter. */
function runReporter(tests: FakeTest[], rawRunPath: string): void {
  const suite = { title: "Checkout", suites: [], tests, parent: undefined };
  for (const test of tests) test.parent = suite;

  let endHandler: (() => void) | undefined;
  const runner = {
    suite,
    startTime: Date.now(),
    on: (event: string, cb: () => void) => {
      if (event === "end") endHandler = cb;
    },
  };
  createReporter(runner as never, {
    reporterOptions: {
      specPath: SPEC,
      rawRunPath,
      formats: [],
      outputDir: path.join(os.tmpdir(), "es-cypress-planned"),
    },
  } as never);
  endHandler?.();
}

function readRun(rawRunPath: string) {
  return JSON.parse(fs.readFileSync(rawRunPath, "utf8")) as {
    testCases: Array<{ title: string; status: string; story: { steps: unknown[]; suitePath?: string[] } }>;
  };
}

afterEach(() => {
  clearStore();
});

describe("planned scenarios", () => {
  it("records a bodyless it() as todo", () => {
    const rawRunPath = path.join(os.tmpdir(), `es-planned-${Date.now()}.json`);
    recordMeta({
      specRelative: SPEC,
      titlePath: ["Checkout", "an order is placed"],
      meta: { scenario: "an order is placed", steps: [{ id: "s0", keyword: "Then", text: "it works" }] },
    } as never);

    runReporter(
      [
        { title: "an order is placed", state: "passed", duration: 5 },
        { title: "a suspended account is blocked", pending: true },
      ],
      rawRunPath,
    );

    const run = readRun(rawRunPath);
    const planned = run.testCases.find((tc) => tc.status === "todo");
    expect(planned?.title).toBe("a suspended account is blocked");
    expect(planned?.story.steps).toEqual([]);
    expect(planned?.story.suitePath).toEqual(["Checkout"]);
    fs.rmSync(rawRunPath, { force: true });
  });

  it("leaves it.skip alone: a body means it can run", () => {
    const rawRunPath = path.join(os.tmpdir(), `es-skip-${Date.now()}.json`);
    recordMeta({
      specRelative: SPEC,
      titlePath: ["Checkout", "an order is placed"],
      meta: { scenario: "an order is placed", steps: [] },
    } as never);

    runReporter(
      [
        { title: "an order is placed", state: "passed", duration: 5 },
        { title: "quarantined for now", pending: true, fn: () => {} },
      ],
      rawRunPath,
    );

    const run = readRun(rawRunPath);
    expect(run.testCases.some((tc) => tc.status === "todo")).toBe(false);
    fs.rmSync(rawRunPath, { force: true });
  });

  it("does not leak planned scenarios out of a spec with no story tests", () => {
    const rawRunPath = path.join(os.tmpdir(), `es-none-${Date.now()}.json`);
    runReporter([{ title: "never written", pending: true }], rawRunPath);
    expect(fs.existsSync(rawRunPath)).toBe(false);
  });
});
