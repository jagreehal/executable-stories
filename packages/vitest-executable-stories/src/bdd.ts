/**
 * TS-first BDD helpers for Vitest. This is Vitest, not Cucumber.
 *
 * - story() is describe() with story metadata
 * - Steps are it() tests with keyword labels
 * - All Vitest modifiers work: .skip, .only, .todo, .fails, .concurrent
 * - No enforced Given→When→Then ordering
 * - Keyword is purely presentational
 */
import { describe, it } from "vitest";
import { AsyncLocalStorage } from "node:async_hooks";
import type { StepKeyword } from "@executable-stories/core";

// Re-export core types for consumers
export type { StepKeyword } from "@executable-stories/core";

/** Current story's StepsApi when inside a story() callback. Used by vitest-executable-stories/steps. */
const storyApiStore = new AsyncLocalStorage<StepsApi>();
let activeStoryApi: StepsApi | null = null;

/**
 * Returns the current story's StepsApi. Only valid when called from inside a story() callback.
 * @internal Used by the steps module for module-level given/when/then.
 */
export function _getStoryApi(): StepsApi {
  const api = storyApiStore.getStore() ?? activeStoryApi;
  if (!api) {
    throw new Error(
      "_getStoryApi() must be called from inside a story() callback. Did you call steps.given() from inside story('...', (steps) => { ... })?",
    );
  }
  return api;
}

// ============================================================================
// Types
// ============================================================================

export type StepMode = "normal" | "skip" | "only" | "todo" | "fails" | "concurrent";

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

/** Doc-only story meta for framework-native test: test('xxx', ({ task }) => { doc.story('xxx', task); ... }). */
function createDocOnlyStoryMeta(title: string, suitePath?: string[]): StoryMeta {
  return { scenario: title, steps: [], suitePath };
}

// docStoryOverload is defined after story() - see end of file. Exported const is assigned there.

/**
 * Options for configuring a story.
 *
 * @example
 * ```ts
 * story("Admin deletes user", { tags: ["admin"], ticket: "JIRA-123" }, (steps) => {
 *   steps.given("admin is logged in", () => {});
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
 * story("User logs in", (steps) => {
 *   steps.given("user credentials", () => {});
 *   steps.doc.kv("Username", "testuser");
 *   steps.doc.mermaid(`graph LR\n  A-->B`);
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
 * API provided to story definition functions for defining steps and adding documentation.
 * Includes BDD keywords (given/when/then), AAA pattern aliases (arrange/act/assert),
 * and a rich documentation API.
 *
 * @example
 * ```ts
 * story("User logs in", (steps) => {
 *   steps.given("user is on login page", () => { ... });
 *   steps.when("user submits credentials", () => { ... });
 *   steps.then("user sees dashboard", () => { ... });
 *   steps.doc.note("This story requires valid test credentials");
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

/**
 * doc.story is `story(...)` plus a Vitest-native overload:
 * `it('x', ({ task }) => { doc.story('x', task); ... })`
 * Task overload is first so doc.story(title, task) resolves correctly.
 */
export type DocStoryFn = ((title: string, task: { meta: object }) => void) & StoryFn;

type StoryDefineFn = (steps: StepsApi) => void;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Build the StepsApi with all keywords, aliases, and doc API.
 * Both static and runtime docs use closure binding to the current step.
 * The difference is the phase label: static docs are meant for documentation
 * that doesn't depend on runtime values.
 */
function buildStepsApi(steps: StoryStep[], stepDefs: StepDef[]): StepsApi {
  // Runtime doc context for concurrent step execution
  const runtimeDocStore = new AsyncLocalStorage<DocApi>();
  // Most recently declared step for static docs at registration time
  let lastDefinedDoc: DocApi | null = null;
  const primaryCounts: Record<"Given" | "When" | "Then", number> = {
    Given: 0,
    When: 0,
    Then: 0,
  };

  const resolveKeyword = (keyword: StepKeyword): StepKeyword => {
    if (keyword === "Given" || keyword === "When" || keyword === "Then") {
      const count = primaryCounts[keyword];
      primaryCounts[keyword] = count + 1;
      return count === 0 ? keyword : "And";
    }
    return keyword;
  };

  // Proxy doc API that delegates to the current step's bound doc API
  const doc: DocApi = {
    note(text: string) {
      const target = runtimeDocStore.getStore() ?? lastDefinedDoc;
      target?.note(text);
    },
    tag(name: string | string[]) {
      const target = runtimeDocStore.getStore() ?? lastDefinedDoc;
      target?.tag(name);
    },
    kv(label: string, value: unknown) {
      const target = runtimeDocStore.getStore() ?? lastDefinedDoc;
      target?.kv(label, value);
    },
    code(label: string, content: unknown, lang?: string) {
      const target = runtimeDocStore.getStore() ?? lastDefinedDoc;
      target?.code(label, content, lang);
    },
    json(label: string, value: unknown) {
      const target = runtimeDocStore.getStore() ?? lastDefinedDoc;
      target?.json(label, value);
    },
    table(label: string, columns: string[], rows: string[][]) {
      const target = runtimeDocStore.getStore() ?? lastDefinedDoc;
      target?.table(label, columns, rows);
    },
    link(label: string, url: string) {
      const target = runtimeDocStore.getStore() ?? lastDefinedDoc;
      target?.link(label, url);
    },
    section(title: string, markdown: string) {
      const target = runtimeDocStore.getStore() ?? lastDefinedDoc;
      target?.section(title, markdown);
    },
    mermaid(code: string, title?: string) {
      const target = runtimeDocStore.getStore() ?? lastDefinedDoc;
      target?.mermaid(code, title);
    },
    screenshot(path: string, alt?: string) {
      const target = runtimeDocStore.getStore() ?? lastDefinedDoc;
      target?.screenshot(path, alt);
    },
    custom(type: string, data: unknown) {
      const target = runtimeDocStore.getStore() ?? lastDefinedDoc;
      target?.custom(type, data);
    },
    story: docStoryOverload,
    get runtime(): DocRuntimeApi {
      const runtimeDoc = runtimeDocStore.getStore();
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
   * Create a closure-bound doc API for a specific step.
   */
  function createStepDocApi(stepIndex: number): DocApi {
    const addDoc = (entry: DocEntry) => {
      steps[stepIndex].docs ??= [];
      steps[stepIndex].docs!.push(entry);
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
      story: docStoryOverload,
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
   * Create a step function with all modifiers for a given keyword.
   */
  function createStepFn(keyword: StepKeyword): StepFn {
    const base = (text: string, fn?: () => void | Promise<void>) => {
      const resolvedKeyword = resolveKeyword(keyword);
      const stepIndex = steps.length;
      steps.push({ keyword: resolvedKeyword, text, docs: [] });

      const stepDocApi = createStepDocApi(stepIndex);
      lastDefinedDoc = stepDocApi;

      const impl = fn ?? (() => {});
      stepDefs.push({
        keyword: resolvedKeyword,
        text,
        mode: "normal",
        fn: async () => {
          // Bind doc API for this step's execution (safe for concurrency)
          await runtimeDocStore.run(stepDocApi, impl);
        },
      });
    };

    base.skip = (text: string, _fn?: () => void | Promise<void>) => {
      const resolvedKeyword = resolveKeyword(keyword);
      const stepIndex = steps.length;
      steps.push({ keyword: resolvedKeyword, text, mode: "skip", docs: [] });

      const stepDocApi = createStepDocApi(stepIndex);
      lastDefinedDoc = stepDocApi;

      stepDefs.push({ keyword: resolvedKeyword, text, mode: "skip", fn: undefined });
    };

    base.only = (text: string, fn: () => void | Promise<void>) => {
      const resolvedKeyword = resolveKeyword(keyword);
      const stepIndex = steps.length;
      steps.push({ keyword: resolvedKeyword, text, mode: "only", docs: [] });

      const stepDocApi = createStepDocApi(stepIndex);
      lastDefinedDoc = stepDocApi;

      stepDefs.push({
        keyword: resolvedKeyword,
        text,
        mode: "only",
        fn: async () => {
          await runtimeDocStore.run(stepDocApi, fn);
        },
      });
    };

    base.todo = (text: string) => {
      const resolvedKeyword = resolveKeyword(keyword);
      const stepIndex = steps.length;
      steps.push({ keyword: resolvedKeyword, text, mode: "todo", docs: [] });
      lastDefinedDoc = createStepDocApi(stepIndex);
      stepDefs.push({ keyword: resolvedKeyword, text, fn: undefined, mode: "todo" });
    };

    base.fails = (text: string, fn: () => void | Promise<void>) => {
      const resolvedKeyword = resolveKeyword(keyword);
      const stepIndex = steps.length;
      steps.push({ keyword: resolvedKeyword, text, mode: "fails", docs: [] });

      const stepDocApi = createStepDocApi(stepIndex);
      lastDefinedDoc = stepDocApi;

      stepDefs.push({
        keyword: resolvedKeyword,
        text,
        mode: "fails",
        fn: async () => {
          await runtimeDocStore.run(stepDocApi, fn);
        },
      });
    };

    base.concurrent = (text: string, fn: () => void | Promise<void>) => {
      const resolvedKeyword = resolveKeyword(keyword);
      const stepIndex = steps.length;
      steps.push({ keyword: resolvedKeyword, text, mode: "concurrent", docs: [] });

      const stepDocApi = createStepDocApi(stepIndex);
      lastDefinedDoc = stepDocApi;

      stepDefs.push({
        keyword: resolvedKeyword,
        text,
        mode: "concurrent",
        fn: async () => {
          await runtimeDocStore.run(stepDocApi, fn);
        },
      });
    };

    return base;
  }

  const given = createStepFn("Given");
  const when = createStepFn("When");
  const then = createStepFn("Then");
  const and = createStepFn("And");
  const but = createStepFn("But");

  return {
    // BDD keywords
    given,
    when,
    then,
    and,
    but,

    // AAA pattern aliases
    arrange: given,
    act: when,
    assert: then,

    // Additional aliases
    setup: given,
    context: given,
    execute: when,
    action: when,
    verify: then,

    // Rich documentation API
    doc,
  };
}

/**
 * Register a step as a Vitest test with the appropriate modifier.
 * Meta is attached at registration time so the reporter can read it
 * even for skipped/todo tests that don't execute.
 *
 * Note: Vitest's runtime supports `meta` in options (via TaskCustomOptions),
 * but the exported types don't expose it on TestCollectorOptions. We use
 * a type assertion since the runtime behavior is correct.
 */
function registerStep(step: StepDef, story: StoryMeta): void {
  const testName = `${step.keyword} ${step.text}`;
  // Vitest runtime supports meta in options, but types don't expose it
  const options = { meta: { story } } as Record<string, unknown>;

  switch (step.mode) {
    case "skip":
      it.skip(testName, options, step.fn ?? (() => {}));
      break;
    case "only":
      it.only(testName, options, step.fn ?? (() => {}));
      break;
    case "todo":
      // it.todo may not accept options - emulate with skip
      // Mode is already recorded in story.steps for docs rendering
      it.skip(testName, options, () => {});
      break;
    case "fails":
      it.fails(testName, options, step.fn ?? (() => {}));
      break;
    case "concurrent":
      it.concurrent(testName, options, step.fn ?? (() => {}));
      break;
    default:
      it(testName, options, step.fn ?? (() => {}));
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
  const descFn =
    mode === "skip" ? describe.skip : mode === "only" ? describe.only : describe;

  descFn(title, () => {
    const stepDefs: StepDef[] = [];
    const steps: StoryStep[] = [];

    const api = buildStepsApi(steps, stepDefs);
    activeStoryApi = api;
    try {
      storyApiStore.run(api, () => define(api));
    } finally {
      activeStoryApi = null;
    }

    // Use direct reference to steps array so runtime docs are visible
    // Each story has its own steps array, and runtime docs attach via closures
    const story: StoryMeta = {
      scenario: title,
      steps, // Direct reference for runtime doc visibility
      tags: options?.tags,
      tickets: options?.ticket
        ? Array.isArray(options.ticket)
          ? options.ticket
          : [options.ticket]
        : undefined,
      meta: options?.meta, // Nested, not spread!
    };

    // Register tests with shared story reference
    for (const step of stepDefs) {
      registerStep(step, story);
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
 * Define a story. Each step becomes one Vitest test.
 * Stamp task.meta.story on each step so the StoryReporter can collect and write Markdown.
 *
 * @example
 * story("User logs in", (steps) => {
 *   steps.given("user is on login page", () => { ... });
 *   steps.when("user submits credentials", () => { ... });
 *   steps.then("user sees dashboard", () => { ... });
 * });
 *
 * @example With options
 * story("Admin deletes user", { tags: ["admin"], meta: { priority: "high" } }, (steps) => {
 *   steps.given("admin is logged in", () => { ... });
 *   steps.when("admin clicks delete", () => { ... });
 *   steps.then("user is removed", () => { ... });
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
 * Extract the suite path (parent describe names) from a Vitest task object.
 */
function extractSuitePath(
  task: { suite?: unknown; file?: { name?: string } },
  storyTitle: string,
): string[] | undefined {
  const path: string[] = [];
  const fileName = task.file?.name;
  let current = task.suite as { name?: string; suite?: unknown } | undefined;

  while (current) {
    const name = current.name;
    // Filter: non-empty, not story title, not root markers, not file paths
    if (
      name &&
      name.trim() !== "" &&
      name !== storyTitle &&
      name !== "<root>" &&
      name !== fileName &&
      !looksLikeFilePath(name)
    ) {
      path.unshift(name);
    }
    current = current.suite as { name?: string; suite?: unknown } | undefined;
  }

  return path.length > 0 ? path : undefined;
}

/**
 * doc.story overload: (title, callback) => story(title, callback);
 * (title, task) => set task.meta.story for framework-native it('xxx', ({ task }) => { doc.story('xxx', task); ... }).
 */
export const docStoryOverload: DocStoryFn = Object.assign(
  function docStoryOverloadImpl(
    title: string,
    second?: ((steps: StepsApi) => void) | StoryOptions | { meta: object },
    third?: (steps: StepsApi) => void,
  ): void {
    if (arguments.length < 2) {
      throw new Error(
        "In Vitest, doc.story(title, task) requires the task argument. Use it('...', ({ task }) => { doc.story('Title', task); ... }).",
      );
    }
    if (typeof second === "function") {
      story(title, second);
      return;
    }
    if (
      second != null &&
      typeof second === "object" &&
      "meta" in second &&
      !("tags" in second) &&
      !("ticket" in second)
    ) {
      const taskObj = second as { meta: { story?: unknown }; suite?: unknown; file?: { name?: string } };
      const suitePath = extractSuitePath(taskObj, title);
      taskObj.meta.story = createDocOnlyStoryMeta(title, suitePath);
      return;
    }
    if (third !== undefined) {
      story(title, second as StoryOptions, third);
    } else {
      story(title, second as StoryDefineFn);
    }
  },
  { skip: story.skip, only: story.only },
);
