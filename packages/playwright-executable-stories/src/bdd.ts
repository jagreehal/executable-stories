/**
 * TS-first BDD helpers for Playwright. This is Playwright, not Cucumber.
 *
 * - scenario() is test.describe() with story metadata
 * - Steps are test() with keyword labels and story-docs annotation
 * - Playwright modifiers: .skip, .only, .fixme, .fail, .slow
 * - No enforced Given→When→Then ordering
 * - Keyword is purely presentational
 */
import { test } from "@playwright/test";

// ============================================================================
// Types
// ============================================================================

export type StepKeyword = "Given" | "When" | "Then" | "And";
export type StepMode = "normal" | "skip" | "only" | "fixme" | "fail" | "slow" | "todo";

// ============================================================================
// Doc Entry Types
// ============================================================================

/** Phase tracks when the doc entry was added */
export type DocPhase = "static" | "runtime";

/** Union type for all documentation entry kinds */
export type DocEntry =
  | { kind: "note"; text: string; phase: DocPhase }
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
  /** Source spec file path (set by scenario() from call stack for output routing). */
  sourceFile?: string;
}

/** Annotation type used by the reporter to find story metadata. */
export const STORY_ANNOTATION_TYPE = "story-docs";

/** Annotation type for runtime doc entries (pushed via testInfo.annotations). */
export const STORY_RUNTIME_DOC_ANNOTATION_TYPE = "story-docs-runtime";

/**
 * Options for configuring a scenario.
 *
 * @example
 * ```ts
 * scenario("Admin deletes user", { tags: ["admin"], ticket: "JIRA-123" }, ({ given }) => {
 *   given("admin is logged in", async ({ page }) => {});
 * });
 * ```
 */
export type ScenarioOptions = {
  /** Tags for filtering and categorizing scenarios */
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
 * Full documentation API available during scenario definition.
 * Use these methods to add rich documentation to your test steps.
 */
export interface DocApi {
  /** Add a free-text note to the step documentation */
  note(text: string): void;
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
  (text: string, fn: (args: PlaywrightTestArgs) => void | Promise<void>): void;
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
// Scenario Function Type with Modifiers
// ============================================================================

export type ScenarioFn = {
  (title: string, define: (steps: StepsApi) => void): void;
  (title: string, options: ScenarioOptions, define: (steps: StepsApi) => void): void;
  skip: {
    (title: string, define: (steps: StepsApi) => void): void;
    (title: string, options: ScenarioOptions, define: (steps: StepsApi) => void): void;
  };
  only: {
    (title: string, define: (steps: StepsApi) => void): void;
    (title: string, options: ScenarioOptions, define: (steps: StepsApi) => void): void;
  };
  fixme: {
    (title: string, define: (steps: StepsApi) => void): void;
    (title: string, options: ScenarioOptions, define: (steps: StepsApi) => void): void;
  };
  slow: {
    (title: string, define: (steps: StepsApi) => void): void;
    (title: string, options: ScenarioOptions, define: (steps: StepsApi) => void): void;
  };
};

// ============================================================================
// Implementation
// ============================================================================

/**
 * Build the StepsApi with all keywords, aliases, and doc API.
 * Static docs attach to the most recently declared step; runtime docs are appended via annotations.
 */
function buildStepsApi(steps: StoryStep[], stepDefs: StepDef[]): StepsApi {
  type AnnotationTarget = { annotations: Array<{ type: string; description: string }> };
  let lastDeclaredStepIndex = -1;
  let currentRuntimeDoc: DocRuntimeApi | null = null;
  let currentRuntimeAnnotations: AnnotationTarget | undefined;
  let currentRuntimeStepIndex: number | undefined;

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

  const pushStaticEntry = (entry: DocEntry) => {
    if (currentRuntimeAnnotations && currentRuntimeStepIndex != null) {
      pushRuntimeAnnotation(currentRuntimeAnnotations, currentRuntimeStepIndex, entry);
      return;
    }
    if (lastDeclaredStepIndex >= 0) {
      steps[lastDeclaredStepIndex].docs ??= [];
      steps[lastDeclaredStepIndex].docs!.push(entry);
    }
  };

  const doc: DocApi = {
    note(text: string) {
      pushStaticEntry({ kind: "note", text, phase: "static" });
    },
    kv(label: string, value: unknown) {
      pushStaticEntry({ kind: "kv", label, value, phase: "static" });
    },
    code(label: string, content: unknown, lang?: string) {
      const str = typeof content === "string" ? content : JSON.stringify(content, null, 2);
      pushStaticEntry({ kind: "code", label, content: str, lang: lang ?? "json", phase: "static" });
    },
    json(label: string, value: unknown) {
      const str = typeof value === "string" ? value : JSON.stringify(value, null, 2);
      pushStaticEntry({ kind: "code", label, content: str, lang: "json", phase: "static" });
    },
    table(label: string, columns: string[], rows: string[][]) {
      pushStaticEntry({ kind: "table", label, columns, rows, phase: "static" });
    },
    link(label: string, url: string) {
      pushStaticEntry({ kind: "link", label, url, phase: "static" });
    },
    section(title: string, markdown: string) {
      pushStaticEntry({ kind: "section", title, markdown, phase: "static" });
    },
    mermaid(code: string, title?: string) {
      pushStaticEntry({ kind: "mermaid", code, title, phase: "static" });
    },
    screenshot(path: string, alt?: string) {
      pushStaticEntry({ kind: "screenshot", path, alt, phase: "static" });
    },
    custom(type: string, data: unknown) {
      pushStaticEntry({ kind: "custom", type, data, phase: "static" });
    },
    get runtime(): DocRuntimeApi {
      if (!currentRuntimeDoc) {
        throw new Error("doc.runtime.* must be called during step execution.");
      }
      return currentRuntimeDoc;
    },
    set runtime(value: DocRuntimeApi) {
      currentRuntimeDoc = value;
    },
  };

  function createRuntimeDocApi(stepIndex: number): DocRuntimeApi & { _testInfo?: AnnotationTarget } {
    const runtimeDoc: DocRuntimeApi & { _testInfo?: AnnotationTarget } = {
      note(text: string) {
        pushRuntimeAnnotation(runtimeDoc._testInfo, stepIndex, { kind: "note", text, phase: "runtime" });
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
    fn: (args: PlaywrightTestArgs) => void | Promise<void>,
    runtimeDoc: DocRuntimeApi & { _testInfo?: AnnotationTarget },
    stepIndex: number,
  ) => {
    return async (
      playwrightArgs: PlaywrightTestArgs,
      testInfo?: AnnotationTarget,
    ) => {
      (doc as { runtime: DocRuntimeApi }).runtime = runtimeDoc;
      if (testInfo) {
        currentRuntimeAnnotations = testInfo;
        currentRuntimeStepIndex = stepIndex;
        runtimeDoc._testInfo = testInfo;
      }
      try {
        await fn(playwrightArgs);
      } finally {
        (doc as { runtime: DocRuntimeApi }).runtime = null as unknown as DocRuntimeApi;
        currentRuntimeAnnotations = undefined;
        currentRuntimeStepIndex = undefined;
        runtimeDoc._testInfo = undefined;
      }
    };
  };

  function createStepFn(keyword: StepKeyword): StepFn {
    const base = (text: string, fn: (args: PlaywrightTestArgs) => void | Promise<void>) => {
      const stepIndex = steps.length;
      steps.push({ keyword, text, docs: [] });
      lastDeclaredStepIndex = stepIndex;

      const runtimeDoc = createRuntimeDocApi(stepIndex);
      const wrapped = wrapStep(fn, runtimeDoc, stepIndex);

      // Playwright callback: (args, testInfo) => void. Use destructuring for args to satisfy Playwright.
      const wrappedWithDestructure = async (
        { page, context, browser, request, browserName }: PlaywrightTestArgs,
        testInfo?: AnnotationTarget,
      ) => wrapped({ page, context, browser, request, browserName } as PlaywrightTestArgs, testInfo);

      stepDefs.push({
        keyword,
        text,
        fn: wrappedWithDestructure as (args: PlaywrightTestArgs) => void | Promise<void>,
        mode: "normal",
      });
    };

    base.skip = (text: string, fn?: (args: PlaywrightTestArgs) => void | Promise<void>) => {
      const stepIndex = steps.length;
      steps.push({ keyword, text, mode: "skip", docs: [] });
      lastDeclaredStepIndex = stepIndex;
      stepDefs.push({ keyword, text, fn, mode: "skip" });
    };

    base.only = (text: string, fn: (args: PlaywrightTestArgs) => void | Promise<void>) => {
      const stepIndex = steps.length;
      steps.push({ keyword, text, mode: "only", docs: [] });
      lastDeclaredStepIndex = stepIndex;

      const runtimeDoc = createRuntimeDocApi(stepIndex);
      const wrapped = wrapStep(fn, runtimeDoc, stepIndex);
      const wrappedWithDestructure = async (
        { page, context, browser, request, browserName }: PlaywrightTestArgs,
        testInfo?: AnnotationTarget,
      ) => wrapped({ page, context, browser, request, browserName } as PlaywrightTestArgs, testInfo);

      stepDefs.push({
        keyword,
        text,
        fn: wrappedWithDestructure as (args: PlaywrightTestArgs) => void | Promise<void>,
        mode: "only",
      });
    };

    base.fixme = (text: string, fn?: (args: PlaywrightTestArgs) => void | Promise<void>) => {
      const stepIndex = steps.length;
      steps.push({ keyword, text, mode: "fixme", docs: [] });
      lastDeclaredStepIndex = stepIndex;
      stepDefs.push({ keyword, text, fn, mode: "fixme" });
    };

    base.todo = (text: string) => {
      const stepIndex = steps.length;
      steps.push({ keyword, text, mode: "todo", docs: [] });
      lastDeclaredStepIndex = stepIndex;
      stepDefs.push({ keyword, text, fn: undefined, mode: "todo" });
    };

    base.fail = (text: string, fn: (args: PlaywrightTestArgs) => void | Promise<void>) => {
      const stepIndex = steps.length;
      steps.push({ keyword, text, mode: "fail", docs: [] });
      lastDeclaredStepIndex = stepIndex;

      const runtimeDoc = createRuntimeDocApi(stepIndex);
      const wrapped = wrapStep(fn, runtimeDoc, stepIndex);
      const wrappedWithDestructure = async (
        { page, context, browser, request, browserName }: PlaywrightTestArgs,
        testInfo?: AnnotationTarget,
      ) => wrapped({ page, context, browser, request, browserName } as PlaywrightTestArgs, testInfo);

      stepDefs.push({
        keyword,
        text,
        fn: wrappedWithDestructure as (args: PlaywrightTestArgs) => void | Promise<void>,
        mode: "fail",
      });
    };

    base.slow = (text: string, fn: (args: PlaywrightTestArgs) => void | Promise<void>) => {
      const stepIndex = steps.length;
      steps.push({ keyword, text, mode: "slow", docs: [] });
      lastDeclaredStepIndex = stepIndex;

      const runtimeDoc = createRuntimeDocApi(stepIndex);
      const wrapped = wrapStep(fn, runtimeDoc, stepIndex);
      const wrappedWithDestructure = async (
        { page, context, browser, request, browserName }: PlaywrightTestArgs,
        testInfo?: AnnotationTarget,
      ) => wrapped({ page, context, browser, request, browserName } as PlaywrightTestArgs, testInfo);

      stepDefs.push({
        keyword,
        text,
        fn: wrappedWithDestructure as (args: PlaywrightTestArgs) => void | Promise<void>,
        mode: "slow",
      });
    };

    return base;
  }

  const given = createStepFn("Given");
  const when = createStepFn("When");
  const then = createStepFn("Then");
  const and = createStepFn("And");

  return {
    given,
    when,
    then,
    and,
    arrange: given,
    act: when,
    assert: then,
    setup: given,
    context: given,
    execute: when,
    action: when,
    verify: then,
    doc,
  };
}

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
 * Core scenario implementation with deferred step registration.
 */
function scenarioImpl(
  title: string,
  options: ScenarioOptions | undefined,
  define: (steps: StepsApi) => void,
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
    const steps: StoryStep[] = [];

    const api = buildStepsApi(steps, stepDefs);
    define(api);

    const story: StoryMeta = {
      scenario: title,
      steps: [...steps],
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
      registerStep(step, story);
    }
  });
}

/**
 * Parse overloaded scenario arguments.
 */
function parseScenarioArgs(
  args: [string, ScenarioOptions | ((steps: StepsApi) => void), ((steps: StepsApi) => void)?],
): { title: string; options?: ScenarioOptions; define: (steps: StepsApi) => void } {
  const [title, second, third] = args;
  if (typeof second === "function") {
    return { title, define: second };
  }
  return { title, options: second, define: third! };
}

const scenarioImplNormal = (
  ...args: [string, ScenarioOptions | ((steps: StepsApi) => void), ((steps: StepsApi) => void)?]
) => {
  const { title, options, define } = parseScenarioArgs(args);
  scenarioImpl(title, options, define, "normal");
};

const scenarioImplSkip = (
  ...args: [string, ScenarioOptions | ((steps: StepsApi) => void), ((steps: StepsApi) => void)?]
) => {
  const { title, options, define } = parseScenarioArgs(args);
  scenarioImpl(title, options, define, "skip");
};

const scenarioImplOnly = (
  ...args: [string, ScenarioOptions | ((steps: StepsApi) => void), ((steps: StepsApi) => void)?]
) => {
  const { title, options, define } = parseScenarioArgs(args);
  scenarioImpl(title, options, define, "only");
};

const scenarioImplFixme = (
  ...args: [string, ScenarioOptions | ((steps: StepsApi) => void), ((steps: StepsApi) => void)?]
) => {
  const { title, options, define } = parseScenarioArgs(args);
  scenarioImpl(title, options, define, "fixme");
};

const scenarioImplSlow = (
  ...args: [string, ScenarioOptions | ((steps: StepsApi) => void), ((steps: StepsApi) => void)?]
) => {
  const { title, options, define } = parseScenarioArgs(args);
  scenarioImpl(title, options, define, "slow");
};

/**
 * Define a scenario (user story). Each step becomes one Playwright test with a story-docs annotation.
 * Use StoryReporter to collect annotations and write Markdown.
 *
 * @example
 * scenario("User logs in", ({ given, when, then }) => {
 *   given("user is on login page", async ({ page }) => { ... });
 *   when("user submits credentials", async ({ page }) => { ... });
 *   then("user sees dashboard", async ({ page }) => { ... });
 * });
 */
export const scenario: ScenarioFn = Object.assign(scenarioImplNormal, {
  skip: scenarioImplSkip,
  only: scenarioImplOnly,
  fixme: scenarioImplFixme,
  slow: scenarioImplSlow,
});
