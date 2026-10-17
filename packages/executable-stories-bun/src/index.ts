/**
 * Bun Executable Stories
 *
 * bun:test exposes neither the running test's name nor its result, so this
 * package exports thin `test` / `it` / `describe` wrappers over bun:test that
 * record both, plus the shared `story` API. Add the preload so the run is
 * written when bun finishes:
 *
 * ```toml
 * # bunfig.toml
 * [test]
 * preload = ["executable-stories-bun/preload"]
 * ```
 *
 * @example
 * ```ts
 * import { expect } from 'bun:test';
 * import { describe, story, test } from 'executable-stories-bun';
 *
 * describe('Calculator', () => {
 *   test('adds two numbers', () => {
 *     story.init({ tags: ['math'] });
 *     story.given('two numbers 5 and 3');
 *     story.when('I add them together');
 *     const result = 5 + 3;
 *     story.then('the result is 8');
 *     expect(result).toBe(8);
 *   });
 * });
 * ```
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { fileURLToPath } from "node:url";
import { describe as bunDescribe, onTestFinished, test as bunTest } from "bun:test";
import type { DocEntry, NormalizedTicket, StepKeyword, StoryStep } from "executable-stories-core/types/story";
import { collector, type TestRecord } from "./collector";

export type { StoryMeta, StoryStep, DocEntry, StepKeyword } from "executable-stories-core/types/story";

/** A ticket reference: a plain id or an object with id and optional url. */
export type TicketInput = string | { id: string; url?: string };

export interface StoryOptions {
  tags?: string[];
  ticket?: TicketInput | TicketInput[];
  /** Product-code paths/globs this scenario exercises (project-root-relative). */
  covers?: string[];
  meta?: Record<string, unknown>;
}

// ============================================================================
// Test registration
// ============================================================================

if (!Bun.semver.satisfies(Bun.version, ">=1.3.3")) {
  throw new Error(`executable-stories-bun needs Bun 1.3.3 or later; this is Bun ${Bun.version}.`);
}

const current = new AsyncLocalStorage<TestRecord>();
const ownFile = fileURLToPath(import.meta.url);

/** Describe names (and skip/todo state) enclosing the test being registered. */
const describeStack: Array<{ name: string; mode?: "skip" | "todo" }> = [];

/** File and line of the first stack frame outside this module: the `test(...)` call. */
function callSite(): { file: string; line: number } {
  for (const frame of (new Error().stack ?? "").split("\n").slice(1)) {
    // Top-level frames in Bun carry no column: "at /path/file.ts:3".
    const match = /\(?((?:file:\/\/)?[^\s()]+?):(\d+)(?::\d+)?\)?\s*$/.exec(frame);
    if (!match) continue;
    const file = match[1].startsWith("file://") ? fileURLToPath(match[1]) : match[1];
    if (file !== ownFile) return { file, line: Number(match[2]) };
  }
  return { file: "unknown", line: 1 };
}

function register(title: string, status?: "skip" | "todo", options?: TestOptions): TestRecord {
  const enclosing = describeStack.find((d) => d.mode)?.mode;
  const record: TestRecord = {
    title,
    suitePath: describeStack.map((d) => d.name),
    ...callSite(),
    status: status ?? enclosing,
    ran: false,
    stepCounter: 0,
    attempts: 0,
    retries: (typeof options === "object" && options.retry) || 0,
  };
  collector().records.push(record);
  return record;
}

type TestBody = () => void | Promise<unknown>;
type TestOptions = Parameters<typeof bunTest>[2];

const toError = (err: unknown) =>
  err instanceof Error ? { message: err.message, stack: err.stack } : { message: String(err) };

/**
 * Run the body with its record active, and record how it settled. A body that resolves has not
 * passed yet: afterEach hooks, onTestFinished callbacks and expect.assertions() can still fail it,
 * and bun reports none of them. So the wrapper registers its own onTestFinished once the body
 * resolves, behind the test's own callbacks: bun skips it after a throwing afterEach or callback,
 * leaving the test failed. When it runs, the preload's assertion count settles the rest.
 */
function wrap(record: TestRecord, body: TestBody): TestBody {
  return () => {
    // A retry runs the body again: forget the attempt before.
    Object.assign(record, { ran: true, status: undefined, error: undefined, story: undefined, stepCounter: 0, concurrent: undefined });
    record.attempts++;
    const start = performance.now();
    const settle = () => {
      const { assertions, expected } = collector();
      const unmet = expected && (expected.exact ? assertions !== expected.count : assertions < expected.count);
      record.status = unmet ? "fail" : "pass";
      record.error = unmet
        ? { message: `expected ${expected.exact ? "" : "at least "}${expected.count} assertion(s), but test ended with ${assertions}` }
        : undefined;
    };
    // Chained rather than caught, so bun receives the original error and points at the test.
    const outcome = current.run(record, async () => body());
    outcome.catch((err: unknown) => {
      record.durationMs = performance.now() - start;
      record.status = "fail";
      record.error = toError(err);
    });
    // Chained outside current.run, so onTestFinished registers from bun's own context.
    return outcome.then(() => {
      record.durationMs = performance.now() - start;
      // settle() replaces this when bun runs the callback below.
      record.status = "fail";
      record.error = { message: "the test body passed, but an afterEach hook or onTestFinished callback failed" };
      try {
        onTestFinished(settle);
      } catch {
        // Concurrent tests forbid onTestFinished. The flush confirms this pass only if no afterEach
        // failed and nothing declared expect.assertions() (the counter is shared) in the run.
        record.status = "pass";
        record.error = undefined;
        record.concurrent = true;
      }
    });
  };
}

/** bun:test's `test`, recording the name, location and result for the story report. */
export const test = Object.assign(
  (title: string, body: TestBody, options?: TestOptions) => {
    bunTest(title, wrap(register(title, undefined, options), body), options);
  },
  {
    only(title: string, body: TestBody, options?: TestOptions) {
      bunTest.only(title, wrap(register(title, undefined, options), body), options);
    },
    skip(title: string, body: TestBody = () => {}, options?: TestOptions) {
      register(title, "skip");
      bunTest.skip(title, body, options);
    },
    todo(title: string, body?: TestBody, options?: TestOptions) {
      register(title, "todo");
      bunTest.todo(title, body ?? (() => {}), options);
    },
  },
);

export const it = test;

function describeWith(run: (name: string, fn: () => void) => void, mode?: "skip" | "todo") {
  return (name: string, fn: () => void) =>
    run(name, () => {
      describeStack.push({ name, mode });
      try {
        fn();
      } finally {
        describeStack.pop();
      }
    });
}

/** bun:test's `describe`, tracking the suite path. The callback must be synchronous. */
export const describe = Object.assign(describeWith(bunDescribe), {
  // Read on call: under CI=true, bun throws as soon as `.only` is accessed.
  only: (name: string, fn: () => void) => describeWith(bunDescribe.only)(name, fn),
  skip: describeWith(bunDescribe.skip, "skip"),
  todo: describeWith(bunDescribe.todo, "todo"),
});

// ============================================================================
// Story API
// ============================================================================

function active(): TestRecord & { story: NonNullable<TestRecord["story"]> } {
  const record = current.getStore();
  if (!record?.story) {
    throw new Error(
      "story.init() must be called first, inside a test from executable-stories-bun: test('name', () => { story.init(); ... })",
    );
  }
  return record as TestRecord & { story: NonNullable<TestRecord["story"]> };
}

function normalizeTickets(ticket: StoryOptions["ticket"]): NormalizedTicket[] | undefined {
  if (!ticket) return undefined;
  return (Array.isArray(ticket) ? ticket : [ticket]).map((t) => (typeof t === "string" ? { id: t } : t));
}

let sourceOrder = 0;

function init(options: StoryOptions = {}): void {
  const record = current.getStore();
  if (!record) {
    throw new Error("story.init() must run inside a test registered with executable-stories-bun's test/it.");
  }
  record.story = {
    scenario: record.title,
    steps: [],
    suitePath: record.suitePath.length ? record.suitePath : undefined,
    tags: options.tags,
    tickets: normalizeTickets(options.ticket),
    covers: options.covers,
    meta: options.meta,
    sourceOrder: sourceOrder++,
    startedAtMs: Date.now(),
  };
}

function createStep(keyword: StepKeyword) {
  function step(text: string): void;
  function step<T>(text: string, body: () => T): T;
  function step<T>(text: string, body?: () => T): T | void {
    const record = active();
    const { steps } = record.story;
    // A repeated Given/When/Then reads as "And", as in every other adapter.
    const resolved: StepKeyword =
      (keyword === "Given" || keyword === "When" || keyword === "Then") && steps.some((s) => s.keyword === keyword)
        ? "And"
        : keyword;
    const entry: StoryStep = {
      id: `step-${record.stepCounter++}`,
      startedAtMs: Date.now(),
      keyword: resolved,
      text,
      docs: [],
      ...(body ? { wrapped: true } : {}),
    };
    steps.push(entry);
    if (!body) return;
    const start = performance.now();
    const done = () => (entry.durationMs = performance.now() - start);
    let sync = true;
    try {
      const result = body();
      if (result instanceof Promise) {
        sync = false;
        return result.finally(done) as T;
      }
      return result;
    } finally {
      if (sync) done();
    }
  }
  return step;
}

function attach(entry: DocEntry): DocEntry {
  const { story } = active();
  const step = story.steps.at(-1);
  if (step) (step.docs ??= []).push(entry);
  else (story.docs ??= []).push(entry);
  return entry;
}

/**
 * The story API. Call `story.init()` first inside a `test` from this package.
 */
export const story = {
  init,

  given: createStep("Given"),
  when: createStep("When"),
  then: createStep("Then"),
  and: createStep("And"),
  but: createStep("But"),

  arrange: createStep("Given"),
  act: createStep("When"),
  assert: createStep("Then"),

  note: (text: string) => attach({ kind: "note", text, phase: "runtime" }),
  tag: (names: string | string[]) =>
    attach({ kind: "tag", names: Array.isArray(names) ? names : [names], phase: "runtime" }),
  kv: (options: { label: string; value: unknown }) => attach({ kind: "kv", ...options, phase: "runtime" }),
  json: (options: { label: string; value: unknown }) =>
    attach({ kind: "code", label: options.label, content: JSON.stringify(options.value, null, 2), lang: "json", phase: "runtime" }),
  code: (options: { label: string; content: string; lang?: string }) => attach({ kind: "code", ...options, phase: "runtime" }),
  table: (options: { label: string; columns: string[]; rows: string[][] }) =>
    attach({ kind: "table", ...options, phase: "runtime" }),
  link: (options: { label: string; url: string }) => attach({ kind: "link", ...options, phase: "runtime" }),
};

export type Story = typeof story;
