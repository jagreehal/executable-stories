/**
 * TS-first BDD helpers for Jest. This is Jest, not Cucumber.
 *
 * - story() is describe() with story metadata
 * - Steps are test() cases with keyword labels
 * - Supported modifiers: .skip, .only, .todo, .fails (via test.failing), .concurrent (when available)
 * - No enforced Given→When→Then ordering
 * - Keyword is purely presentational
 */
import { describe, test, afterAll, expect } from "@jest/globals";
import { AsyncLocalStorage } from "node:async_hooks";
import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import type { StepKeyword } from "@executable-stories/core";

// Re-export core types for consumers
export type { StepKeyword } from "@executable-stories/core";

// ============================================================================
// Types
// ============================================================================

export type StepMode = "normal" | "skip" | "only" | "todo" | "fails" | "concurrent";

const it = test;
const storyRegistry = new Map<string, StoryMeta[]>();
/** Inline doc.story(title) calls from test('xxx', () => { doc.story('xxx'); ... }) — merged into storyRegistry at flush. */
const inlineStoriesByPath = new Map<string, StoryMeta[]>();
let afterAllRegistered = false;

// AsyncLocalStorage to track current story context for top-level step functions
interface StoryContext {
  steps: StoryStep[];
  stepDefs: StepDef[];
  runtimeDocStore: AsyncLocalStorage<DocApi>;
  lastDefinedDoc: DocApi | null;
  primaryCounts: Record<"Given" | "When" | "Then", number>;
}
const storyContextStore = new AsyncLocalStorage<StoryContext>();

function getTestPath(): string {
  return expect.getState().testPath ?? "unknown";
}

function getOutputDir(): string {
  const baseDir = process.env.JEST_STORY_DOCS_DIR ?? ".jest-executable-stories";
  return path.resolve(process.cwd(), baseDir);
}

function flushStories(): void {
  // Merge inline doc.story(title) scenarios into registry so they are written
  for (const [testFilePath, list] of inlineStoriesByPath) {
    const existing = storyRegistry.get(testFilePath) ?? [];
    storyRegistry.set(testFilePath, [...existing, ...list]);
  }
  inlineStoriesByPath.clear();

  if (storyRegistry.size === 0) return;
  const workerId = process.env.JEST_WORKER_ID ?? "0";
  const outputDir = path.join(getOutputDir(), `worker-${workerId}`);
  fs.mkdirSync(outputDir, { recursive: true });

  for (const [testFilePath, scenarios] of storyRegistry) {
    if (!scenarios.length) continue;
    const hash = createHash("sha1").update(testFilePath).digest("hex").slice(0, 12);
    const baseName = testFilePath === "unknown" ? "unknown" : path.basename(testFilePath);
    const outFile = path.join(outputDir, `${baseName}.${hash}.json`);
    const payload = { testFilePath, scenarios };
    fs.writeFileSync(outFile, JSON.stringify(payload, null, 2) + "\n", "utf8");
  }
  storyRegistry.clear();
}

function registerAfterAll(): void {
  if (afterAllRegistered) return;
  afterAllRegistered = true;
  afterAll(() => {
    flushStories();
  });
}


// ============================================================================
// Doc Entry Types
// ============================================================================

/** Phase tracks when the doc entry was added */
export type DocPhase = "static" | "runtime";

/** Union type for all documentation entry kinds */
export type DocEntry =
  | { kind: "note"; text: string; phase: DocPhase }
  | { kind: "tag"; names: string[]; phase: DocPhase }
  | { kind: "kv"; label: string; value: unknown; phase: DocPhase }
  | { kind: "code"; label: string; content: string; lang?: string; phase: DocPhase }
  | { kind: "table"; label: string; columns: string[]; rows: string[][]; phase: DocPhase }
  | { kind: "link"; label: string; url: string; phase: DocPhase }
  | { kind: "section"; title: string; markdown: string; phase: DocPhase }
  | { kind: "mermaid"; code: string; title?: string; phase: DocPhase }
  | { kind: "screenshot"; path: string; alt?: string; phase: DocPhase }
  | { kind: "custom"; type: string; data: unknown; phase: DocPhase };

/**
 * A single step in a scenario with its documentation entries.
 */
export interface StoryStep {
  /** The BDD keyword (Given, When, Then, And) */
  keyword: StepKeyword;
  /** The step description text */
  text: string;
  /** Step execution mode for docs rendering (show "skipped", "todo", etc.) */
  mode?: StepMode;
  /** Rich documentation entries attached to this step */
  docs?: DocEntry[];
}

/**
 * Metadata for a complete scenario, attached to test task.meta.story.
 * Used by the reporter to generate documentation.
 */
export interface StoryMeta {
  /** The scenario title */
  scenario: string;
  /** All steps in this scenario */
  steps: StoryStep[];
  /** Tags for filtering and categorization */
  tags?: string[];
  /** Ticket/issue references (normalized to array) */
  tickets?: string[];
  /** User-defined metadata (nested, not spread) */
  meta?: Record<string, unknown>;
  /** Parent describe/suite names for hierarchical grouping (optional, omitted when empty) */
  suitePath?: string[];
}

/** Serializable shape attached to task.meta.story for the reporter. */
export const STORY_META_KEY = "story";

/**
 * Extract the suite path from Jest's currentTestName.
 * Jest separates test path components with ' > ' in some configurations.
 */
function extractSuitePath(currentTestName: string | undefined): string[] | undefined {
  if (!currentTestName) return undefined;

  // Try ' > ' separator first (some Jest configs)
  if (currentTestName.includes(" > ")) {
    const parts = currentTestName.split(" > ");
    const path = parts.slice(0, -1); // Remove test name (last part)
    return path.length > 0 ? path : undefined;
  }

  // If no delimiter is present, suitePath is omitted for Jest.
  // Output still renders scenarios correctly, just without describe headings.
  return undefined;
}

/** Doc-only story meta for framework-native test: test('xxx', () => { doc.story('xxx'); ... }). */
function createDocOnlyStoryMeta(title: string, suitePath?: string[]): StoryMeta {
  return { scenario: title, steps: [], suitePath };
}

/**
 * doc.story overload: (title, callback) => story(title, callback);
 * (title) => register current test as story for docs (framework-native test('xxx', () => { doc.story('xxx'); ... })).
 */
function docStoryOverload(
  title: string,
  second?: ((steps: StepsApi) => void) | undefined,
): void {
  if (typeof second === "function") {
    story(title, second);
    return;
  }
  // One-argument: framework-native test('xxx', () => { doc.story('xxx'); ... })
  const testPath = expect.getState().testPath ?? "unknown";
  const currentTestName = expect.getState().currentTestName;
  const suitePath = extractSuitePath(currentTestName);
  const list = inlineStoriesByPath.get(testPath) ?? [];
  list.push(createDocOnlyStoryMeta(title, suitePath));
  inlineStoriesByPath.set(testPath, list);
  registerAfterAll();
}

/**
 * Options for configuring a story.
 *
 * @example
 * ```ts
 * story("Admin deletes user", { tags: ["admin"], ticket: "JIRA-123" }, () => {
 *   given("admin is logged in", () => {});
 * });
 * ```
 */
export type StoryOptions = {
  /** Tags for filtering and categorizing scenarios */
  tags?: string[];
  /** Ticket/issue reference(s) for requirements traceability */
  ticket?: string | string[];
  /** Arbitrary user-defined metadata */
  meta?: Record<string, unknown>;
};

// Internal step definition used during registration
interface StepDef {
  keyword: StepKeyword;
  text: string;
  fn?: () => void | Promise<void>;
  mode: StepMode;
}

// ============================================================================
// Step Function Type with Modifiers
// ============================================================================

export type StepFn = {
  (text: string, fn?: () => void | Promise<void>): void;
  skip: (text: string, fn?: () => void | Promise<void>) => void;
  only: (text: string, fn: () => void | Promise<void>) => void;
  todo: (text: string) => void;
  fails: (text: string, fn: () => void | Promise<void>) => void;
  concurrent: (text: string, fn: () => void | Promise<void>) => void;
};

// ============================================================================
// Doc API Types
// ============================================================================

/**
 * Runtime doc API - subset of documentation methods only available during step execution.
 * Use `doc.runtime.*` to capture values that are only known at test runtime.
 */
export interface DocRuntimeApi {
  /** Add a free-text note to the step documentation */
  note(text: string): void;
  /** Add tag(s) to the step documentation */
  tag(name: string | string[]): void;
  /** Add a key-value pair to the step documentation */
  kv(label: string, value: unknown): void;
  /** Add a code block with optional language for syntax highlighting */
  code(label: string, content: unknown, lang?: string): void;
  /** Add a JSON code block (shorthand for code with lang="json") */
  json(label: string, value: unknown): void;
  /** Add a Mermaid diagram with optional title */
  mermaid(code: string, title?: string): void;
  /** Add a screenshot image reference */
  screenshot(path: string, alt?: string): void;
  /** Add a custom documentation entry for use with custom renderers */
  custom(type: string, data: unknown): void;
}

/**
 * Full documentation API available during story definition.
 * Use these methods to add rich documentation to your test steps.
 *
 * @example
 * ```ts
 * story("User logs in", () => {
 *   given("user credentials", () => {});
 *   doc.kv("Username", "testuser");
 *   doc.mermaid(`graph LR\n  A-->B`);
 * });
 * ```
 */
export interface DocApi {
  /** Add a free-text note to the step documentation */
  note(text: string): void;
  /** Add tag(s) to the step documentation for categorization */
  tag(name: string | string[]): void;
  /** Add a key-value pair to the step documentation */
  kv(label: string, value: unknown): void;
  /** Add a code block with optional language for syntax highlighting */
  code(label: string, content: unknown, lang?: string): void;
  /** Add a JSON code block (shorthand for code with lang="json") */
  json(label: string, value: unknown): void;
  /** Add a markdown table with column headers and row data */
  table(label: string, columns: string[], rows: string[][]): void;
  /** Add a hyperlink to external documentation or resources */
  link(label: string, url: string): void;
  /** Add a titled section with arbitrary markdown content */
  section(title: string, markdown: string): void;
  /** Add a Mermaid diagram with optional title */
  mermaid(code: string, title?: string): void;
  /** Add a screenshot image reference with optional alt text */
  screenshot(path: string, alt?: string): void;
  /** Add a custom documentation entry for use with custom renderers */
  custom(type: string, data: unknown): void;
  /** Define a story using the same API as `story()` */
  story: DocStoryFn;
  /** Runtime-only API for capturing values known only at test execution time */
  runtime: DocRuntimeApi;
}

// ============================================================================
// Steps API with BDD keywords and aliases
// ============================================================================

/**
 * API for defining steps and adding documentation.
 * Includes BDD keywords (given/when/then), AAA pattern aliases (arrange/act/assert),
 * and a rich documentation API.
 *
 * @example
 * ```ts
 * import { story, given, when, then, doc } from "jest-executable-stories";
 *
 * story("User logs in", () => {
 *   given("user is on login page", () => { ... });
 *   when("user submits credentials", () => { ... });
 *   then("user sees dashboard", () => { ... });
 *   doc.note("This story requires valid test credentials");
 * });
 * ```
 */
export interface StepsApi {
  /** Define a precondition step (Given) */
  given: StepFn;
  /** Define an action step (When) */
  when: StepFn;
  /** Define an assertion step (Then) */
  then: StepFn;
  /** Define a continuation step (And) - inherits context from previous keyword */
  and: StepFn;
  /** Define a negative assertion step (But) - always renders as "But", never auto-converts to "And" */
  but: StepFn;

  /** Alias for given - AAA pattern (Arrange) */
  arrange: StepFn;
  /** Alias for when - AAA pattern (Act) */
  act: StepFn;
  /** Alias for then - AAA pattern (Assert) */
  assert: StepFn;

  /** Alias for given - setup context */
  setup: StepFn;
  /** Alias for given - establish context */
  context: StepFn;
  /** Alias for when - execute action */
  execute: StepFn;
  /** Alias for when - perform action */
  action: StepFn;
  /** Alias for then - verify outcome */
  verify: StepFn;

  /** Rich documentation API for adding notes, tables, diagrams, etc. */
  doc: DocApi;
}

// ============================================================================
// Story Function Type with Modifiers
// ============================================================================

export type StoryFn = {
  (title: string, define: () => void): void;
  (title: string, define: (steps: StepsApi) => void): void;
  (title: string, options: StoryOptions, define: () => void): void;
  (title: string, options: StoryOptions, define: (steps: StepsApi) => void): void;
  skip: {
    (title: string, define: () => void): void;
    (title: string, define: (steps: StepsApi) => void): void;
    (title: string, options: StoryOptions, define: () => void): void;
    (title: string, options: StoryOptions, define: (steps: StepsApi) => void): void;
  };
  only: {
    (title: string, define: () => void): void;
    (title: string, define: (steps: StepsApi) => void): void;
    (title: string, options: StoryOptions, define: () => void): void;
    (title: string, options: StoryOptions, define: (steps: StepsApi) => void): void;
  };
};

/** doc.story: same as story() plus (title) for framework-native test('x', () => { doc.story('x'); }). */
export type DocStoryFn = StoryFn & ((title: string) => void);

type StoryDefineFn = (steps: StepsApi) => void;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Create a closure-bound doc API for a specific step.
 */
function createStepDocApi(ctx: StoryContext, stepIndex: number): DocApi {
  const addDoc = (entry: DocEntry) => {
    ctx.steps[stepIndex].docs ??= [];
    ctx.steps[stepIndex].docs!.push(entry);
  };

  const staticApi: DocApi = {
    note(text: string) {
      addDoc({ kind: "note", text, phase: "static" });
    },
    tag(name: string | string[]) {
      const names = Array.isArray(name) ? name : [name];
      addDoc({ kind: "tag", names, phase: "static" });
    },
    kv(label: string, value: unknown) {
      addDoc({ kind: "kv", label, value, phase: "static" });
    },
    code(label: string, content: unknown, lang?: string) {
      const str = typeof content === "string" ? content : JSON.stringify(content, null, 2);
      addDoc({ kind: "code", label, content: str, lang: lang ?? "json", phase: "static" });
    },
    json(label: string, value: unknown) {
      const str = JSON.stringify(value, null, 2);
      addDoc({ kind: "code", label, content: str, lang: "json", phase: "static" });
    },
    table(label: string, columns: string[], rows: string[][]) {
      addDoc({ kind: "table", label, columns, rows, phase: "static" });
    },
    link(label: string, url: string) {
      addDoc({ kind: "link", label, url, phase: "static" });
    },
    section(title: string, markdown: string) {
      addDoc({ kind: "section", title, markdown, phase: "static" });
    },
    mermaid(code: string, title?: string) {
      addDoc({ kind: "mermaid", code, title, phase: "static" });
    },
    screenshot(path: string, alt?: string) {
      addDoc({ kind: "screenshot", path, alt, phase: "static" });
    },
    custom(type: string, data: unknown) {
      addDoc({ kind: "custom", type, data, phase: "static" });
    },
    story: story as DocStoryFn,
    runtime: {
      note(text: string) {
        addDoc({ kind: "note", text, phase: "runtime" });
      },
      tag(name: string | string[]) {
        const names = Array.isArray(name) ? name : [name];
        addDoc({ kind: "tag", names, phase: "runtime" });
      },
      kv(label: string, value: unknown) {
        addDoc({ kind: "kv", label, value, phase: "runtime" });
      },
      code(label: string, content: unknown, lang?: string) {
        const str = typeof content === "string" ? content : JSON.stringify(content, null, 2);
        addDoc({ kind: "code", label, content: str, lang: lang ?? "json", phase: "runtime" });
      },
      json(label: string, value: unknown) {
        const str = JSON.stringify(value, null, 2);
        addDoc({ kind: "code", label, content: str, lang: "json", phase: "runtime" });
      },
      mermaid(code: string, title?: string) {
        addDoc({ kind: "mermaid", code, title, phase: "runtime" });
      },
      screenshot(path: string, alt?: string) {
        addDoc({ kind: "screenshot", path, alt, phase: "runtime" });
      },
      custom(type: string, data: unknown) {
        addDoc({ kind: "custom", type, data, phase: "runtime" });
      },
    },
  };

  return staticApi;
}

/**
 * Get the current story context, throwing if called outside a story.
 */
function getStoryContext(): StoryContext {
  const ctx = storyContextStore.getStore();
  if (!ctx) {
    throw new Error(
      "Step functions (given, when, then, etc.) must be called inside a story(). Did you call given() from inside story('...', () => { ... })?",
    );
  }
  return ctx;
}

function resolveKeyword(ctx: StoryContext, keyword: StepKeyword): StepKeyword {
  if (keyword === "Given" || keyword === "When" || keyword === "Then") {
    const count = ctx.primaryCounts[keyword];
    ctx.primaryCounts[keyword] = count + 1;
    return count === 0 ? keyword : "And";
  }
  return keyword;
}

/**
 * Create a step function with all modifiers for a given keyword.
 * Uses the current story context from AsyncLocalStorage.
 */
function createTopLevelStepFn(keyword: StepKeyword): StepFn {
  const base = (text: string, fn?: () => void | Promise<void>) => {
    const ctx = getStoryContext();
    const resolvedKeyword = resolveKeyword(ctx, keyword);
    const stepIndex = ctx.steps.length;
    ctx.steps.push({ keyword: resolvedKeyword, text, docs: [] });

    const stepDocApi = createStepDocApi(ctx, stepIndex);
    ctx.lastDefinedDoc = stepDocApi;

    const impl = fn ?? (() => {});
    ctx.stepDefs.push({
      keyword: resolvedKeyword,
      text,
      mode: "normal",
      fn: async () => {
        // Bind doc API for this step's execution (safe for concurrency)
        await ctx.runtimeDocStore.run(stepDocApi, impl);
      },
    });
  };

  base.skip = (text: string, _fn?: () => void | Promise<void>) => {
    const ctx = getStoryContext();
    const resolvedKeyword = resolveKeyword(ctx, keyword);
    const stepIndex = ctx.steps.length;
    ctx.steps.push({ keyword: resolvedKeyword, text, mode: "skip", docs: [] });

    const stepDocApi = createStepDocApi(ctx, stepIndex);
    ctx.lastDefinedDoc = stepDocApi;

    ctx.stepDefs.push({ keyword: resolvedKeyword, text, mode: "skip", fn: undefined });
  };

  base.only = (text: string, fn: () => void | Promise<void>) => {
    const ctx = getStoryContext();
    const resolvedKeyword = resolveKeyword(ctx, keyword);
    const stepIndex = ctx.steps.length;
    ctx.steps.push({ keyword: resolvedKeyword, text, mode: "only", docs: [] });

    const stepDocApi = createStepDocApi(ctx, stepIndex);
    ctx.lastDefinedDoc = stepDocApi;

    ctx.stepDefs.push({
      keyword: resolvedKeyword,
      text,
      mode: "only",
      fn: async () => {
        await ctx.runtimeDocStore.run(stepDocApi, fn);
      },
    });
  };

  base.todo = (text: string) => {
    const ctx = getStoryContext();
    const resolvedKeyword = resolveKeyword(ctx, keyword);
    const stepIndex = ctx.steps.length;
    ctx.steps.push({ keyword: resolvedKeyword, text, mode: "todo", docs: [] });
    ctx.lastDefinedDoc = createStepDocApi(ctx, stepIndex);
    ctx.stepDefs.push({ keyword: resolvedKeyword, text, fn: undefined, mode: "todo" });
  };

  base.fails = (text: string, fn: () => void | Promise<void>) => {
    const ctx = getStoryContext();
    const resolvedKeyword = resolveKeyword(ctx, keyword);
    const stepIndex = ctx.steps.length;
    ctx.steps.push({ keyword: resolvedKeyword, text, mode: "fails", docs: [] });

    const stepDocApi = createStepDocApi(ctx, stepIndex);
    ctx.lastDefinedDoc = stepDocApi;

    ctx.stepDefs.push({
      keyword: resolvedKeyword,
      text,
      mode: "fails",
      fn: async () => {
        await ctx.runtimeDocStore.run(stepDocApi, fn);
      },
    });
  };

  base.concurrent = (text: string, fn: () => void | Promise<void>) => {
    const ctx = getStoryContext();
    const resolvedKeyword = resolveKeyword(ctx, keyword);
    const stepIndex = ctx.steps.length;
    ctx.steps.push({ keyword: resolvedKeyword, text, mode: "concurrent", docs: [] });

    const stepDocApi = createStepDocApi(ctx, stepIndex);
    ctx.lastDefinedDoc = stepDocApi;

    ctx.stepDefs.push({
      keyword: resolvedKeyword,
      text,
      mode: "concurrent",
      fn: async () => {
        await ctx.runtimeDocStore.run(stepDocApi, fn);
      },
    });
  };

  return base;
}

// ============================================================================
// Top-level Step Exports
// ============================================================================

/** Define a precondition step (Given) */
export const given: StepFn = createTopLevelStepFn("Given");

/** Define an action step (When) */
export const when: StepFn = createTopLevelStepFn("When");

/** Define an assertion step (Then) */
export const then: StepFn = createTopLevelStepFn("Then");

/** Define a continuation step (And) - inherits context from previous keyword */
export const and: StepFn = createTopLevelStepFn("And");

/** Define a negative assertion step (But) - always renders as "But", never auto-converts to "And" */
export const but: StepFn = createTopLevelStepFn("But");

// AAA pattern aliases
/** Alias for given - AAA pattern (Arrange) */
export const arrange: StepFn = given;

/** Alias for when - AAA pattern (Act) */
export const act: StepFn = when;

/** Alias for then - AAA pattern (Assert) */
export const assert: StepFn = then;

// Additional aliases
/** Alias for given - setup context */
export const setup: StepFn = given;

/** Alias for given - establish context */
export const context: StepFn = given;

/** Alias for when - execute action */
export const execute: StepFn = when;

/** Alias for when - perform action */
export const action: StepFn = when;

/** Alias for then - verify outcome */
export const verify: StepFn = then;

/**
 * Top-level doc API that delegates to the current story context.
 */
export const doc: DocApi = {
  note(text: string) {
    const ctx = storyContextStore.getStore();
    const target = ctx?.runtimeDocStore.getStore() ?? ctx?.lastDefinedDoc;
    target?.note(text);
  },
  tag(name: string | string[]) {
    const ctx = storyContextStore.getStore();
    const target = ctx?.runtimeDocStore.getStore() ?? ctx?.lastDefinedDoc;
    target?.tag(name);
  },
  kv(label: string, value: unknown) {
    const ctx = storyContextStore.getStore();
    const target = ctx?.runtimeDocStore.getStore() ?? ctx?.lastDefinedDoc;
    target?.kv(label, value);
  },
  code(label: string, content: unknown, lang?: string) {
    const ctx = storyContextStore.getStore();
    const target = ctx?.runtimeDocStore.getStore() ?? ctx?.lastDefinedDoc;
    target?.code(label, content, lang);
  },
  json(label: string, value: unknown) {
    const ctx = storyContextStore.getStore();
    const target = ctx?.runtimeDocStore.getStore() ?? ctx?.lastDefinedDoc;
    target?.json(label, value);
  },
  table(label: string, columns: string[], rows: string[][]) {
    const ctx = storyContextStore.getStore();
    const target = ctx?.runtimeDocStore.getStore() ?? ctx?.lastDefinedDoc;
    target?.table(label, columns, rows);
  },
  link(label: string, url: string) {
    const ctx = storyContextStore.getStore();
    const target = ctx?.runtimeDocStore.getStore() ?? ctx?.lastDefinedDoc;
    target?.link(label, url);
  },
  section(title: string, markdown: string) {
    const ctx = storyContextStore.getStore();
    const target = ctx?.runtimeDocStore.getStore() ?? ctx?.lastDefinedDoc;
    target?.section(title, markdown);
  },
  mermaid(code: string, title?: string) {
    const ctx = storyContextStore.getStore();
    const target = ctx?.runtimeDocStore.getStore() ?? ctx?.lastDefinedDoc;
    target?.mermaid(code, title);
  },
  screenshot(imgPath: string, alt?: string) {
    const ctx = storyContextStore.getStore();
    const target = ctx?.runtimeDocStore.getStore() ?? ctx?.lastDefinedDoc;
    target?.screenshot(imgPath, alt);
  },
  custom(type: string, data: unknown) {
    const ctx = storyContextStore.getStore();
    const target = ctx?.runtimeDocStore.getStore() ?? ctx?.lastDefinedDoc;
    target?.custom(type, data);
  },
  story: undefined as unknown as DocStoryFn,
  get runtime(): DocRuntimeApi {
    const ctx = storyContextStore.getStore();
    const runtimeDoc = ctx?.runtimeDocStore.getStore();
    if (!runtimeDoc) {
      throw new Error("doc.runtime.* must be called during step execution.");
    }
    return runtimeDoc.runtime;
  },
  set runtime(_: DocRuntimeApi) {
    // No-op, runtime is managed per-step
  },
};

/**
 * Steps API object for callers who prefer steps.given/steps.when/steps.then.
 */
export const steps: StepsApi = {
  given,
  when,
  then,
  and,
  but,
  arrange,
  act,
  assert,
  setup,
  context,
  execute,
  action,
  verify,
  doc,
};

/** Singular alias for steps */
export const step: StepsApi = steps;

/**
 * Register a step as a Jest test with the appropriate modifier.
 */
function registerStep(step: StepDef): void {
  const testName = `${step.keyword} ${step.text}`;
  const failing = (it as unknown as { failing?: typeof it }).failing;
  const concurrent = (it as unknown as { concurrent?: typeof it }).concurrent;

  switch (step.mode) {
    case "skip":
      it.skip(testName, step.fn ?? (() => {}));
      break;
    case "only":
      it.only(testName, step.fn ?? (() => {}));
      break;
    case "todo":
      it.todo(testName);
      break;
    case "fails":
      if (failing) {
        failing(testName, step.fn ?? (() => {}));
      } else {
        it(testName, step.fn ?? (() => {}));
      }
      break;
    case "concurrent":
      if (concurrent) {
        concurrent(testName, step.fn ?? (() => {}));
      } else {
        it(testName, step.fn ?? (() => {}));
      }
      break;
    default:
      it(testName, step.fn ?? (() => {}));
  }
}

/**
 * Core story implementation with deferred registration.
 */
function storyImpl(
  title: string,
  options: StoryOptions | undefined,
  define: StoryDefineFn,
  mode: "normal" | "skip" | "only",
): void {
  // Register file-level afterAll so flushStories runs after ALL tests in the file
  // (including framework-native test('xxx', () => { doc.story('xxx'); ... })).
  registerAfterAll();

  const descFn =
    mode === "skip" ? describe.skip : mode === "only" ? describe.only : describe;

  descFn(title, () => {
    const stepDefs: StepDef[] = [];
    const storySteps: StoryStep[] = [];
    const runtimeDocStore = new AsyncLocalStorage<DocApi>();

    // Create story context for this story
    const ctx: StoryContext = {
      steps: storySteps,
      stepDefs,
      runtimeDocStore,
      lastDefinedDoc: null,
      primaryCounts: { Given: 0, When: 0, Then: 0 },
    };

    // Run the define function with the story context active
    storyContextStore.enterWith(ctx);
    define(steps);

    // Use direct reference to steps array so runtime docs are visible
    // Each story has its own steps array, and runtime docs attach via closures
    const storyMeta: StoryMeta = {
      scenario: title,
      steps: storySteps, // Direct reference for runtime doc visibility
      tags: options?.tags,
      tickets: options?.ticket
        ? Array.isArray(options.ticket)
          ? options.ticket
          : [options.ticket]
        : undefined,
      meta: options?.meta, // Nested, not spread!
    };

    const testPath = getTestPath();
    const existing = storyRegistry.get(testPath);
    if (existing) {
      existing.push(storyMeta);
    } else {
      storyRegistry.set(testPath, [storyMeta]);
      registerAfterAll();
    }

    // Register tests with shared story reference
    for (const step of stepDefs) {
      registerStep(step);
    }
  });
}

/**
 * Parse overloaded story arguments.
 */
function parseStoryArgs(
  args: [string, StoryOptions | StoryDefineFn, StoryDefineFn?],
): { title: string; options?: StoryOptions; define: StoryDefineFn } {
  const [title, second, third] = args;
  if (typeof second === "function") {
    return { title, define: second };
  }
  return { title, options: second, define: third! };
}

/**
 * Define a story. Each step becomes one Jest test.
 * Story metadata is captured at registration time and written to disk
 * so the reporter can render docs even for skipped/todo steps.
 *
 * @example
 * story("User logs in", () => {
 *   given("user is on login page", () => { ... });
 *   when("user submits credentials", () => { ... });
 *   then("user sees dashboard", () => { ... });
 * });
 *
 * @example With options
 * story("Admin deletes user", { tags: ["admin"], meta: { priority: "high" } }, () => {
 *   given("admin is logged in", () => { ... });
 *   when("admin clicks delete", () => { ... });
 *   then("user is removed", () => { ... });
 * });
 */
export const story: StoryFn = Object.assign(
  function story(
    ...args: [string, StoryOptions | StoryDefineFn, StoryDefineFn?]
  ): void {
    const { title, options, define } = parseStoryArgs(args);
    storyImpl(title, options, define, "normal");
  },
  {
    skip: Object.assign(
      function skip(
        ...args: [string, StoryOptions | StoryDefineFn, StoryDefineFn?]
      ): void {
        const { title, options, define } = parseStoryArgs(args);
        storyImpl(title, options, define, "skip");
      },
      {},
    ),
    only: Object.assign(
      function only(
        ...args: [string, StoryOptions | StoryDefineFn, StoryDefineFn?]
      ): void {
        const { title, options, define } = parseStoryArgs(args);
        storyImpl(title, options, define, "only");
      },
      {},
    ),
  },
);

doc.story = docStoryOverload as unknown as DocStoryFn;
