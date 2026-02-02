/**
 * TS-first BDD helpers for Playwright. This is Playwright, not Cucumber.
 *
 * - story() is test.describe() with story metadata
 * - Steps are test() with keyword labels and story-docs annotation
 * - Playwright modifiers: .skip, .only, .fixme, .fail, .slow
 * - No enforced Given→When→Then ordering
 * - Keyword is purely presentational
 */
import { test } from "@playwright/test";
import { AsyncLocalStorage } from "node:async_hooks";
import type { StepKeyword } from "@executable-stories/core";

// Re-export core types for consumers
export type { StepKeyword } from "@executable-stories/core";

// ============================================================================
// Types
// ============================================================================

export type StepMode = "normal" | "skip" | "only" | "fixme" | "fail" | "slow" | "todo";

// AsyncLocalStorage to track current story context for top-level step functions
type AnnotationTarget = { annotations: Array<{ type: string; description: string }> };

interface StoryContext {
  steps: StoryStep[];
  stepDefs: StepDef[];
  lastDeclaredStepIndex: number;
  currentRuntimeDoc: DocRuntimeApi | null;
  currentRuntimeAnnotations: AnnotationTarget | undefined;
  currentRuntimeStepIndex: number | undefined;
  primaryCounts: Record<"Given" | "When" | "Then", number>;
}
const storyContextStore = new AsyncLocalStorage<StoryContext>();

// Module-level variables to track context during step execution
// (needed because step execution happens outside the storyContextStore async context)
let activeRuntimeDoc: DocRuntimeApi | null = null;
let activeStepContext: {
  ctx: StoryContext;
  stepIndex: number;
  annotations: AnnotationTarget | undefined;
} | null = null;

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
 * Metadata for a complete scenario, attached to story-docs annotations.
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
  /** Source spec file path (set by story() from call stack for output routing). */
  sourceFile?: string;
  /** Parent describe/suite names for hierarchical grouping (optional, omitted when empty) */
  suitePath?: string[];
}

/** Annotation type used by the reporter to find story metadata. */
export const STORY_ANNOTATION_TYPE = "story-docs";

/**
 * Check if a name looks like a file path (to filter out from suite paths).
 */
function looksLikeFilePath(name: string): boolean {
  // Contains path separators
  if (name.includes("/") || name.includes("\\")) return true;
  // Contains .spec. or .test. anywhere (catches file names without full path)
  if (name.includes(".spec.") || name.includes(".test.")) return true;
  // Ends with file extensions
  if (/\.(spec|test)\.(ts|js|mjs|cjs)$/.test(name)) return true;
  if (/\.(ts|js|mjs|cjs)$/.test(name)) return true;
  return false;
}

/**
 * Extract the suite path from Playwright's test.info().titlePath.
 */
function extractSuitePath(info: { titlePath?: string[] }): string[] | undefined {
  const titlePath = info.titlePath ?? [];

  if (titlePath.length < 2) return undefined;

  // Drop last (test name), filter out file paths
  const withoutTestName = titlePath.slice(0, -1);
  const filtered = withoutTestName.filter((part) => !looksLikeFilePath(part));

  // When multiple parts remain, first is typically project name - skip it. When only one (describe title), keep it.
  const suitePath = filtered.length > 1 ? filtered.slice(1) : filtered;

  return suitePath.length > 0 ? suitePath : undefined;
}

/** Doc-only story meta for framework-native test: test('xxx', () => { doc.story('xxx'); ... }). */
function createDocOnlyStoryMeta(title: string, suitePath?: string[]): StoryMeta {
  return { scenario: title, steps: [], suitePath };
}

/**
 * doc.story overload: (title, callback) => story(title, callback);
 * (title) => when called inside test(), push story annotation via test.info() for docs.
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
  const info = (test as unknown as { info?: () => AnnotationTarget & { titlePath?: string[] } }).info?.();
  if (info?.annotations) {
    const suitePath = extractSuitePath(info as { titlePath?: string[] });
    info.annotations.push({
      type: STORY_ANNOTATION_TYPE,
      description: JSON.stringify(createDocOnlyStoryMeta(title, suitePath)),
    });
    return;
  }
  throw new Error(
    "doc.story(title) with one argument must be called from inside a test() callback. Use test.info() context.",
  );
}

/** Annotation type for runtime doc entries (pushed via testInfo.annotations). */
export const STORY_RUNTIME_DOC_ANNOTATION_TYPE = "story-docs-runtime";

/**
 * Options for configuring a story.
 *
 * @example
 * ```ts
 * story("Admin deletes user", { tags: ["admin"], ticket: "JIRA-123" }, () => {
 *   given("admin is logged in", async ({ page }) => {});
 * });
 * ```
 */
export type StoryOptions = {
  /** Tags for filtering and categorizing stories */
  tags?: string[];
  /** Ticket/issue reference(s) for requirements traceability */
  ticket?: string | string[];
  /** Arbitrary user-defined metadata */
  meta?: Record<string, unknown>;
};

/** Playwright test callback receives fixtures (e.g. { page }, { page, context }). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PlaywrightTestArgs = any;

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
  /** Define a story using the same API as `story()`; one-arg doc.story(title) for framework-native test. */
  story: DocStoryFn;
  /** Runtime-only API for capturing values known only at test execution time */
  runtime: DocRuntimeApi;
}

interface StepDef {
  keyword: StepKeyword;
  text: string;
  fn?: (args: PlaywrightTestArgs) => void | Promise<void>;
  mode: StepMode;
}

// ============================================================================
// Step Function Type with Modifiers (Playwright-native)
// ============================================================================

export type StepFn = {
  (text: string, fn?: (args: PlaywrightTestArgs) => void | Promise<void>): void;
  skip: (text: string, fn?: (args: PlaywrightTestArgs) => void | Promise<void>) => void;
  only: (text: string, fn: (args: PlaywrightTestArgs) => void | Promise<void>) => void;
  fixme: (text: string, fn?: (args: PlaywrightTestArgs) => void | Promise<void>) => void;
  fail: (text: string, fn: (args: PlaywrightTestArgs) => void | Promise<void>) => void;
  slow: (text: string, fn: (args: PlaywrightTestArgs) => void | Promise<void>) => void;
  todo: (text: string) => void;
};

// ============================================================================
// Steps API with BDD keywords and aliases
// ============================================================================

export interface StepsApi {
  given: StepFn;
  when: StepFn;
  then: StepFn;
  and: StepFn;
  but: StepFn;
  arrange: StepFn;
  act: StepFn;
  assert: StepFn;
  setup: StepFn;
  context: StepFn;
  execute: StepFn;
  action: StepFn;
  verify: StepFn;
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
  fixme: {
    (title: string, define: () => void): void;
    (title: string, define: (steps: StepsApi) => void): void;
    (title: string, options: StoryOptions, define: () => void): void;
    (title: string, options: StoryOptions, define: (steps: StepsApi) => void): void;
  };
  slow: {
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

const pushRuntimeAnnotation = (
  target: AnnotationTarget | undefined,
  stepIndex: number,
  entry: DocEntry,
) => {
  if (!target) return;
  target.annotations.push({
    type: STORY_RUNTIME_DOC_ANNOTATION_TYPE,
    description: JSON.stringify({ stepIndex, entry }),
  });
};

const pushStaticEntry = (ctx: StoryContext, entry: DocEntry) => {
  if (ctx.currentRuntimeAnnotations && ctx.currentRuntimeStepIndex != null) {
    pushRuntimeAnnotation(ctx.currentRuntimeAnnotations, ctx.currentRuntimeStepIndex, entry);
    return;
  }
  if (ctx.lastDeclaredStepIndex >= 0) {
    ctx.steps[ctx.lastDeclaredStepIndex].docs ??= [];
    ctx.steps[ctx.lastDeclaredStepIndex].docs!.push(entry);
  }
};

function createRuntimeDocApi(ctx: StoryContext, stepIndex: number): DocRuntimeApi & { _testInfo?: AnnotationTarget } {
  const runtimeDoc: DocRuntimeApi & { _testInfo?: AnnotationTarget } = {
    note(text: string) {
      pushRuntimeAnnotation(runtimeDoc._testInfo, stepIndex, { kind: "note", text, phase: "runtime" });
    },
    tag(name: string | string[]) {
      const names = Array.isArray(name) ? name : [name];
      pushRuntimeAnnotation(runtimeDoc._testInfo, stepIndex, { kind: "tag", names, phase: "runtime" });
    },
    kv(label: string, value: unknown) {
      pushRuntimeAnnotation(runtimeDoc._testInfo, stepIndex, { kind: "kv", label, value, phase: "runtime" });
    },
    code(label: string, content: unknown, lang?: string) {
      const str = typeof content === "string" ? content : JSON.stringify(content, null, 2);
      pushRuntimeAnnotation(runtimeDoc._testInfo, stepIndex, {
        kind: "code",
        label,
        content: str,
        lang: lang ?? "json",
        phase: "runtime",
      });
    },
    json(label: string, value: unknown) {
      const str = typeof value === "string" ? value : JSON.stringify(value, null, 2);
      pushRuntimeAnnotation(runtimeDoc._testInfo, stepIndex, {
        kind: "code",
        label,
        content: str,
        lang: "json",
        phase: "runtime",
      });
    },
    mermaid(code: string, title?: string) {
      pushRuntimeAnnotation(runtimeDoc._testInfo, stepIndex, { kind: "mermaid", code, title, phase: "runtime" });
    },
    screenshot(path: string, alt?: string) {
      pushRuntimeAnnotation(runtimeDoc._testInfo, stepIndex, { kind: "screenshot", path, alt, phase: "runtime" });
    },
    custom(type: string, data: unknown) {
      pushRuntimeAnnotation(runtimeDoc._testInfo, stepIndex, { kind: "custom", type, data, phase: "runtime" });
    },
  };
  return runtimeDoc;
}

const wrapStep = (
  ctx: StoryContext,
  fn: (args: PlaywrightTestArgs) => void | Promise<void>,
  runtimeDoc: DocRuntimeApi & { _testInfo?: AnnotationTarget },
  stepIndex: number,
) => {
  return async (
    playwrightArgs: PlaywrightTestArgs,
    testInfo?: AnnotationTarget,
  ) => {
    ctx.currentRuntimeDoc = runtimeDoc;
    activeRuntimeDoc = runtimeDoc; // Set module-level for doc.runtime access
    if (testInfo) {
      ctx.currentRuntimeAnnotations = testInfo;
      ctx.currentRuntimeStepIndex = stepIndex;
      runtimeDoc._testInfo = testInfo;
    }
    // Set module-level context for doc.* access during step execution
    activeStepContext = { ctx, stepIndex, annotations: testInfo };
    try {
      const run = typeof fn === "function" ? fn : () => {};
      await run(playwrightArgs);
    } finally {
      ctx.currentRuntimeDoc = null;
      activeRuntimeDoc = null;
      activeStepContext = null;
      ctx.currentRuntimeAnnotations = undefined;
      ctx.currentRuntimeStepIndex = undefined;
      runtimeDoc._testInfo = undefined;
    }
  };
};

/**
 * Create a top-level step function with all modifiers for a given keyword.
 * Uses the current story context from AsyncLocalStorage.
 */
function createTopLevelStepFn(keyword: StepKeyword): StepFn {
  const base = (text: string, fn?: (args: PlaywrightTestArgs) => void | Promise<void>) => {
    const ctx = getStoryContext();
    const resolvedKeyword = resolveKeyword(ctx, keyword);
    const stepIndex = ctx.steps.length;
    ctx.steps.push({ keyword: resolvedKeyword, text, docs: [] });
    ctx.lastDeclaredStepIndex = stepIndex;

    const impl = fn ?? (() => {});
    const runtimeDoc = createRuntimeDocApi(ctx, stepIndex);
    const wrapped = wrapStep(ctx, impl, runtimeDoc, stepIndex);

    // Playwright callback: (args, testInfo) => void. Use destructuring for args to satisfy Playwright.
    const wrappedWithDestructure = async (
      { page, context, browser, request, browserName }: PlaywrightTestArgs,
      testInfo?: AnnotationTarget,
    ) => wrapped({ page, context, browser, request, browserName } as PlaywrightTestArgs, testInfo);

    ctx.stepDefs.push({
      keyword: resolvedKeyword,
      text,
      fn: wrappedWithDestructure as (args: PlaywrightTestArgs) => void | Promise<void>,
      mode: "normal",
    });
  };

  base.skip = (text: string, fn?: (args: PlaywrightTestArgs) => void | Promise<void>) => {
    const ctx = getStoryContext();
    const resolvedKeyword = resolveKeyword(ctx, keyword);
    const stepIndex = ctx.steps.length;
    ctx.steps.push({ keyword: resolvedKeyword, text, mode: "skip", docs: [] });
    ctx.lastDeclaredStepIndex = stepIndex;
    ctx.stepDefs.push({ keyword: resolvedKeyword, text, fn, mode: "skip" });
  };

  base.only = (text: string, fn: (args: PlaywrightTestArgs) => void | Promise<void>) => {
    const ctx = getStoryContext();
    const resolvedKeyword = resolveKeyword(ctx, keyword);
    const stepIndex = ctx.steps.length;
    ctx.steps.push({ keyword: resolvedKeyword, text, mode: "only", docs: [] });
    ctx.lastDeclaredStepIndex = stepIndex;

    const runtimeDoc = createRuntimeDocApi(ctx, stepIndex);
    const wrapped = wrapStep(ctx, fn, runtimeDoc, stepIndex);
    const wrappedWithDestructure = async (
      { page, context, browser, request, browserName }: PlaywrightTestArgs,
      testInfo?: AnnotationTarget,
    ) => wrapped({ page, context, browser, request, browserName } as PlaywrightTestArgs, testInfo);

    ctx.stepDefs.push({
      keyword: resolvedKeyword,
      text,
      fn: wrappedWithDestructure as (args: PlaywrightTestArgs) => void | Promise<void>,
      mode: "only",
    });
  };

  base.fixme = (text: string, fn?: (args: PlaywrightTestArgs) => void | Promise<void>) => {
    const ctx = getStoryContext();
    const resolvedKeyword = resolveKeyword(ctx, keyword);
    const stepIndex = ctx.steps.length;
    ctx.steps.push({ keyword: resolvedKeyword, text, mode: "fixme", docs: [] });
    ctx.lastDeclaredStepIndex = stepIndex;
    ctx.stepDefs.push({ keyword: resolvedKeyword, text, fn, mode: "fixme" });
  };

  base.todo = (text: string) => {
    const ctx = getStoryContext();
    const resolvedKeyword = resolveKeyword(ctx, keyword);
    const stepIndex = ctx.steps.length;
    ctx.steps.push({ keyword: resolvedKeyword, text, mode: "todo", docs: [] });
    ctx.lastDeclaredStepIndex = stepIndex;
    ctx.stepDefs.push({ keyword: resolvedKeyword, text, fn: undefined, mode: "todo" });
  };

  base.fail = (text: string, fn: (args: PlaywrightTestArgs) => void | Promise<void>) => {
    const ctx = getStoryContext();
    const resolvedKeyword = resolveKeyword(ctx, keyword);
    const stepIndex = ctx.steps.length;
    ctx.steps.push({ keyword: resolvedKeyword, text, mode: "fail", docs: [] });
    ctx.lastDeclaredStepIndex = stepIndex;

    const runtimeDoc = createRuntimeDocApi(ctx, stepIndex);
    const wrapped = wrapStep(ctx, fn, runtimeDoc, stepIndex);
    const wrappedWithDestructure = async (
      { page, context, browser, request, browserName }: PlaywrightTestArgs,
      testInfo?: AnnotationTarget,
    ) => wrapped({ page, context, browser, request, browserName } as PlaywrightTestArgs, testInfo);

    ctx.stepDefs.push({
      keyword: resolvedKeyword,
      text,
      fn: wrappedWithDestructure as (args: PlaywrightTestArgs) => void | Promise<void>,
      mode: "fail",
    });
  };

  base.slow = (text: string, fn: (args: PlaywrightTestArgs) => void | Promise<void>) => {
    const ctx = getStoryContext();
    const resolvedKeyword = resolveKeyword(ctx, keyword);
    const stepIndex = ctx.steps.length;
    ctx.steps.push({ keyword: resolvedKeyword, text, mode: "slow", docs: [] });
    ctx.lastDeclaredStepIndex = stepIndex;

    const runtimeDoc = createRuntimeDocApi(ctx, stepIndex);
    const wrapped = wrapStep(ctx, fn, runtimeDoc, stepIndex);
    const wrappedWithDestructure = async (
      { page, context, browser, request, browserName }: PlaywrightTestArgs,
      testInfo?: AnnotationTarget,
    ) => wrapped({ page, context, browser, request, browserName } as PlaywrightTestArgs, testInfo);

    ctx.stepDefs.push({
      keyword: resolvedKeyword,
      text,
      fn: wrappedWithDestructure as (args: PlaywrightTestArgs) => void | Promise<void>,
      mode: "slow",
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
 * Helper to push doc entry - routes to annotations during step execution, or static docs during registration.
 */
function pushDocEntry(entry: DocEntry): void {
  const ctx = storyContextStore.getStore();
  if (ctx) {
    // During story registration
    pushStaticEntry(ctx, entry);
  } else if (activeStepContext) {
    // During step execution - push as runtime annotation
    pushRuntimeAnnotation(activeStepContext.annotations, activeStepContext.stepIndex, entry);
  }
}

/**
 * Top-level doc API that delegates to the current story context.
 */
export const doc: DocApi = {
  note(text: string) {
    pushDocEntry({ kind: "note", text, phase: "static" });
  },
  tag(name: string | string[]) {
    const names = Array.isArray(name) ? name : [name];
    pushDocEntry({ kind: "tag", names, phase: "static" });
  },
  kv(label: string, value: unknown) {
    pushDocEntry({ kind: "kv", label, value, phase: "static" });
  },
  code(label: string, content: unknown, lang?: string) {
    const str = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    pushDocEntry({ kind: "code", label, content: str, lang: lang ?? "json", phase: "static" });
  },
  json(label: string, value: unknown) {
    const str = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    pushDocEntry({ kind: "code", label, content: str, lang: "json", phase: "static" });
  },
  table(label: string, columns: string[], rows: string[][]) {
    pushDocEntry({ kind: "table", label, columns, rows, phase: "static" });
  },
  link(label: string, url: string) {
    pushDocEntry({ kind: "link", label, url, phase: "static" });
  },
  section(title: string, markdown: string) {
    pushDocEntry({ kind: "section", title, markdown, phase: "static" });
  },
  mermaid(code: string, title?: string) {
    pushDocEntry({ kind: "mermaid", code, title, phase: "static" });
  },
  screenshot(imgPath: string, alt?: string) {
    pushDocEntry({ kind: "screenshot", path: imgPath, alt, phase: "static" });
  },
  custom(type: string, data: unknown) {
    pushDocEntry({ kind: "custom", type, data, phase: "static" });
  },
  story: docStoryOverload as unknown as DocStoryFn,
  get runtime(): DocRuntimeApi {
    // Use module-level activeRuntimeDoc since step execution happens outside storyContextStore
    if (!activeRuntimeDoc) {
      throw new Error("doc.runtime.* must be called during step execution.");
    }
    return activeRuntimeDoc;
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
 * Register a step as a Playwright test with the appropriate modifier.
 * Story metadata is attached via annotations so the reporter can collect it.
 */
function registerStep(step: StepDef, story: StoryMeta): void {
  const testName = `${step.keyword} ${step.text}`;
  const annotation = { type: STORY_ANNOTATION_TYPE, description: JSON.stringify(story) };
  const opts = { annotation: [annotation] as Array<{ type: string; description: string }> };
  const fn = step.fn ?? ((_args: PlaywrightTestArgs) => {});

  switch (step.mode) {
    case "skip":
      test.skip(testName, opts, fn);
      break;
    case "only":
      test.only(testName, opts, fn);
      break;
    case "fixme":
      test.fixme(testName, opts, fn);
      break;
    case "todo":
      test.skip(testName, opts, (_args: PlaywrightTestArgs) => {});
      break;
    case "fail":
      test.fail(testName, opts, fn);
      break;
    case "slow":
      // test.slow() doesn't accept options with annotation; register as normal test with annotation (slow is doc-only)
      test(testName, opts, fn);
      break;
    default:
      test(testName, opts, fn);
  }
}

/**
 * Parse stack and return the first file path that is not this bdd module (caller spec file).
 */
function getCallerSpecFile(): string | undefined {
  const stack = new Error().stack;
  if (!stack) return undefined;
  const lines = stack.split("\n");
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Match "at ... (path:line:col)" or "at path:line:col"
    const inParen = line.match(/\(([^)]+):\d+:\d+\)/);
    const noParen = line.match(/at\s+([^(\s]+):\d+:\d+$/);
    const file = (inParen?.[1] ?? noParen?.[1])?.trim();
    if (file && !file.endsWith("bdd.ts") && !file.endsWith("bdd.js")) {
      if (file.startsWith("file://")) {
        return file.slice(7);
      }
      return file;
    }
  }
  return undefined;
}

/**
 * Core story implementation with deferred step registration.
 */
function storyImpl(
  title: string,
  options: StoryOptions | undefined,
  define: StoryDefineFn,
  mode: "normal" | "skip" | "only" | "fixme" | "slow",
): void {
  const callerFile = getCallerSpecFile();
  const describeFn =
    mode === "skip"
      ? test.describe.skip
      : mode === "only"
        ? test.describe.only
        : mode === "fixme"
          ? test.describe.fixme
          : mode === "slow"
            ? (name: string, cb: () => void) => {
                test.describe(name, () => {
                  test.describe.configure({ timeout: 90000 });
                  cb();
                });
              }
            : test.describe;

  describeFn(title, () => {
    const stepDefs: StepDef[] = [];
    const storySteps: StoryStep[] = [];

    // Create story context for this story
    const ctx: StoryContext = {
      steps: storySteps,
      stepDefs,
      lastDeclaredStepIndex: -1,
      currentRuntimeDoc: null,
      currentRuntimeAnnotations: undefined,
      currentRuntimeStepIndex: undefined,
      primaryCounts: { Given: 0, When: 0, Then: 0 },
    };

    // Run the define function with the story context active
    storyContextStore.enterWith(ctx);
    define(steps);

    const storyMeta: StoryMeta = {
      scenario: title,
      steps: [...storySteps],
      tags: options?.tags,
      tickets: options?.ticket
        ? Array.isArray(options.ticket)
          ? options.ticket
          : [options.ticket]
        : undefined,
      meta: options?.meta,
      sourceFile: callerFile,
    };

    for (const step of stepDefs) {
      registerStep(step, storyMeta);
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

const storyImplNormal = (
  ...args: [string, StoryOptions | StoryDefineFn, StoryDefineFn?]
) => {
  const { title, options, define } = parseStoryArgs(args);
  storyImpl(title, options, define, "normal");
};

const storyImplSkip = (
  ...args: [string, StoryOptions | StoryDefineFn, StoryDefineFn?]
) => {
  const { title, options, define } = parseStoryArgs(args);
  storyImpl(title, options, define, "skip");
};

const storyImplOnly = (
  ...args: [string, StoryOptions | StoryDefineFn, StoryDefineFn?]
) => {
  const { title, options, define } = parseStoryArgs(args);
  storyImpl(title, options, define, "only");
};

const storyImplFixme = (
  ...args: [string, StoryOptions | StoryDefineFn, StoryDefineFn?]
) => {
  const { title, options, define } = parseStoryArgs(args);
  storyImpl(title, options, define, "fixme");
};

const storyImplSlow = (
  ...args: [string, StoryOptions | StoryDefineFn, StoryDefineFn?]
) => {
  const { title, options, define } = parseStoryArgs(args);
  storyImpl(title, options, define, "slow");
};

/**
 * Define a story. Each step becomes one Playwright test with a story-docs annotation.
 * Use StoryReporter to collect annotations and write Markdown.
 *
 * @example
 * story("User logs in", () => {
 *   given("user is on login page", async ({ page }) => { ... });
 *   when("user submits credentials", async ({ page }) => { ... });
 *   then("user sees dashboard", async ({ page }) => { ... });
 * });
 */
export const story: StoryFn = Object.assign(storyImplNormal, {
  skip: storyImplSkip,
  only: storyImplOnly,
  fixme: storyImplFixme,
  slow: storyImplSlow,
});

doc.story = docStoryOverload as unknown as DocStoryFn;
