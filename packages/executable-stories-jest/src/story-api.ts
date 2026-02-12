/**
 * Jest story.* API for executable-stories.
 *
 * Uses native Jest describe/it/test with opt-in documentation:
 *
 * @example
 * ```ts
 * import { story } from 'executable-stories-jest';
 *
 * describe('Calculator', () => {
 *   it('adds two numbers', () => {
 *     story.init();
 *
 *     story.given('two numbers 5 and 3');
 *     const a = 5;
 *     const b = 3;
 *
 *     story.when('I add them together');
 *     const result = a + b;
 *
 *     story.then('the result is 8');
 *     expect(result).toBe(8);
 *   });
 * });
 * ```
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from 'node:module';
import { tryGetActiveOtelContext, resolveTraceUrl } from 'executable-stories-formatters';
import type {
  DocEntry,
  StepKeyword,
  StoryDocs,
  StoryMeta,
  StoryOptions,
  StoryStep,
  ScopedAttachment,
  AttachmentOptions,
  KvOptions,
  JsonOptions,
  CodeOptions,
  TableOptions,
  LinkOptions,
  SectionOptions,
  MermaidOptions,
  ScreenshotOptions,
  CustomOptions,
} from './types';

// Re-export types for consumers
export type {
  StoryMeta,
  StoryStep,
  DocEntry,
  StepKeyword,
  StoryDocs,
  StoryOptions,
  AttachmentOptions,
} from './types';

// ============================================================================
// Story Context
// ============================================================================

/** Internal timer entry */
interface TimerEntry {
  start: number;
  stepIndex?: number;
  stepId?: string;
  consumed: boolean;
}

interface StoryContext {
  /** The story metadata being built */
  meta: StoryMeta;
  /** The current step (for attaching docs) */
  currentStep: StoryStep | null;
  /** Deterministic step counter (resets per test case) */
  stepCounter: number;
  /** Collected attachments with step scope */
  attachments: ScopedAttachment[];
  /** Active timers keyed by token */
  activeTimers: Map<number, TimerEntry>;
  /** Monotonic timer token counter */
  timerCounter: number;
}

// ============================================================================
// File-based story collection (works across Jest worker processes)
// ============================================================================

// Use globalThis to ensure the registry is shared across module instances
// This is needed because Jest may load the setup file and test files as separate module instances
declare global {
  // eslint-disable-next-line no-var
  var __jestExecutableStoriesRegistry: Map<string, StoryMeta[]> | undefined;
  // eslint-disable-next-line no-var
  var __jestExecutableStoriesExitHandler: boolean | undefined;
}

/** Stories collected during test execution, keyed by test file path */
const storyRegistry: Map<string, StoryMeta[]> = globalThis.__jestExecutableStoriesRegistry ??= new Map();

/** Attachments collected per story, keyed by test file path → scenario name → attachments */
const attachmentRegistry = new Map<string, Map<string, ScopedAttachment[]>>();

/** Track if we've registered the process exit handler */
let exitHandlerRegistered = globalThis.__jestExecutableStoriesExitHandler ?? false;

/** Get the output directory for story JSON files */
function getOutputDir(): string {
  const baseDir = process.env.JEST_STORY_DOCS_DIR ?? ".jest-executable-stories";
  return path.resolve(process.cwd(), baseDir);
}

/** Flush all collected stories to JSON files */
function flushStories(): void {
  if (storyRegistry.size === 0) return;

  const workerId = process.env.JEST_WORKER_ID ?? "0";
  const outputDir = path.join(getOutputDir(), `worker-${workerId}`);
  fs.mkdirSync(outputDir, { recursive: true });

  for (const [testFilePath, scenarios] of storyRegistry) {
    if (!scenarios.length) continue;
    const hash = createHash("sha1").update(testFilePath).digest("hex").slice(0, 12);
    const baseName = testFilePath === "unknown" ? "unknown" : path.basename(testFilePath);
    const outFile = path.join(outputDir, `${baseName}.${hash}.json`);

    // Include attachments per scenario
    const fileAttachments = attachmentRegistry.get(testFilePath);
    const scenariosWithAttachments = scenarios.map((s) => ({
      ...s,
      _attachments: fileAttachments?.get(s.scenario) ?? [],
    }));

    const payload = { testFilePath, scenarios: scenariosWithAttachments };
    fs.writeFileSync(outFile, JSON.stringify(payload, null, 2) + "\n", "utf8");
  }
  storyRegistry.clear();
  attachmentRegistry.clear();
}

/** Register process exit handler to flush stories (once per worker) */
function registerExitHandler(): void {
  if (exitHandlerRegistered) return;
  exitHandlerRegistered = true;
  globalThis.__jestExecutableStoriesExitHandler = true;
  // Use 'exit' event - always fired when Node.js is about to exit
  // Note: Only sync operations work here, which is fine for fs.writeFileSync
  process.on("exit", () => {
    flushStories();
  });
}

// ============================================================================
// Jest-specific context
// ============================================================================

/** Active story context - set by story.init() */
let activeContext: StoryContext | null = null;

/** Counter to track source order of stories (increments on each story.init call) */
let sourceOrderCounter = 0;

/**
 * Get the current story context. Throws if story.init() wasn't called.
 */
function getContext(): StoryContext {
  if (!activeContext) {
    throw new Error(
      "story.init() must be called first. Use: it('name', () => { story.init(); ... });"
    );
  }
  return activeContext;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize ticket option to array format.
 */
function normalizeTickets(ticket: string | string[] | undefined): string[] | undefined {
  if (!ticket) return undefined;
  return Array.isArray(ticket) ? ticket : [ticket];
}

/**
 * Extract the suite path from Jest's currentTestName.
 * Jest's currentTestName is formatted as: "describe1 > describe2 > test name"
 */
function extractSuitePath(currentTestName: string): { suitePath?: string[]; testName: string } {
  const parts = currentTestName.split(" > ");
  if (parts.length <= 1) {
    return { testName: currentTestName };
  }
  const testName = parts[parts.length - 1];
  const suitePath = parts.slice(0, -1);
  return { suitePath, testName };
}

/**
 * Convert StoryDocs inline options to DocEntry array.
 */
function convertStoryDocsToEntries(docs: StoryDocs): DocEntry[] {
  const entries: DocEntry[] = [];

  if (docs.note) {
    entries.push({ kind: "note", text: docs.note, phase: "runtime" });
  }
  if (docs.tag) {
    const names = Array.isArray(docs.tag) ? docs.tag : [docs.tag];
    entries.push({ kind: "tag", names, phase: "runtime" });
  }
  if (docs.kv) {
    for (const [label, value] of Object.entries(docs.kv)) {
      entries.push({ kind: "kv", label, value, phase: "runtime" });
    }
  }
  if (docs.code) {
    entries.push({ kind: "code", label: docs.code.label, content: docs.code.content, lang: docs.code.lang, phase: "runtime" });
  }
  if (docs.json) {
    entries.push({ kind: "code", label: docs.json.label, content: JSON.stringify(docs.json.value, null, 2), lang: "json", phase: "runtime" });
  }
  if (docs.table) {
    entries.push({ kind: "table", label: docs.table.label, columns: docs.table.columns, rows: docs.table.rows, phase: "runtime" });
  }
  if (docs.link) {
    entries.push({ kind: "link", label: docs.link.label, url: docs.link.url, phase: "runtime" });
  }
  if (docs.section) {
    entries.push({ kind: "section", title: docs.section.title, markdown: docs.section.markdown, phase: "runtime" });
  }
  if (docs.mermaid) {
    entries.push({ kind: "mermaid", code: docs.mermaid.code, title: docs.mermaid.title, phase: "runtime" });
  }
  if (docs.screenshot) {
    entries.push({ kind: "screenshot", path: docs.screenshot.path, alt: docs.screenshot.alt, phase: "runtime" });
  }
  if (docs.custom) {
    entries.push({ kind: "custom", type: docs.custom.type, data: docs.custom.data, phase: "runtime" });
  }

  return entries;
}

// ============================================================================
// Helper to attach doc entry to current step or story-level
// ============================================================================

function attachDoc(entry: DocEntry): void {
  const ctx = getContext();
  if (ctx.currentStep) {
    ctx.currentStep.docs ??= [];
    ctx.currentStep.docs.push(entry);
  } else {
    ctx.meta.docs ??= [];
    ctx.meta.docs.push(entry);
  }
}

// ============================================================================
// Step Markers
// ============================================================================

function createStepMarker(keyword: StepKeyword) {
  return function stepMarker(text: string, docs?: StoryDocs): void {
    const ctx = getContext();

    const step: StoryStep = {
      id: `step-${ctx.stepCounter++}`,
      keyword,
      text,
      docs: docs ? convertStoryDocsToEntries(docs) : [],
    };

    ctx.meta.steps.push(step);
    ctx.currentStep = step;
  };
}

// ============================================================================
// story.init() - Jest-specific
// ============================================================================

/**
 * Initialize a story for the current test.
 * Must be called at the start of each test that wants documentation.
 *
 * @param options - Optional story configuration (tags, ticket, meta)
 *
 * @example
 * ```ts
 * it('adds two numbers', () => {
 *   story.init();
 *   // ... rest of test
 * });
 * ```
 */
function init(options?: StoryOptions): void {
  // Get current test info from Jest globals
  const state = expect.getState();
  const currentTestName = state.currentTestName || "Unknown test";
  const testPath = state.testPath || "unknown";

  const { suitePath, testName } = extractSuitePath(currentTestName);

  const meta: StoryMeta = {
    scenario: testName,
    steps: [],
    suitePath,
    tags: options?.tags,
    tickets: normalizeTickets(options?.ticket),
    meta: options?.meta,
    sourceOrder: sourceOrderCounter++,
  };

  // OTel bridge: detect active span, flow data bidirectionally
  const otelCtx = tryGetActiveOtelContext();
  if (otelCtx) {
    // OTel -> Story: capture traceId in structured meta
    meta.meta = { ...meta.meta, otel: { traceId: otelCtx.traceId, spanId: otelCtx.spanId } };

    // OTel -> Story: inject human-readable doc entries
    meta.docs = meta.docs ?? [];
    meta.docs.push({ kind: 'kv', label: 'Trace ID', value: otelCtx.traceId, phase: 'runtime' });

    const template = options?.traceUrlTemplate ?? process.env.OTEL_TRACE_URL_TEMPLATE;
    const url = resolveTraceUrl(template, otelCtx.traceId);
    if (url) {
      meta.docs.push({ kind: 'link', label: 'View Trace', url, phase: 'runtime' });
    }

    // Story -> OTel: enrich active span with story attributes
    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const reqUrl = import.meta.url
        ?? (typeof __filename !== 'undefined' ? `file://${__filename}` : undefined);
      const req = createRequire(reqUrl!);
      const api = req('@opentelemetry/api');
      const span = api.trace?.getActiveSpan?.();
      if (span) {
        span.setAttribute('story.scenario', testName);
        if (options?.tags?.length) span.setAttribute('story.tags', options.tags);
        if (options?.ticket) {
          const tickets = Array.isArray(options.ticket) ? options.ticket : [options.ticket];
          span.setAttribute('story.tickets', tickets);
        }
      }
    } catch { /* OTel not available */ }
  }

  // Store in registry for this file
  const existing = storyRegistry.get(testPath);
  if (existing) {
    existing.push(meta);
  } else {
    storyRegistry.set(testPath, [meta]);
  }

  // Register exit handler to flush stories when worker exits
  registerExitHandler();

  // Set active context
  activeContext = {
    meta,
    currentStep: null,
    stepCounter: 0,
    attachments: [],
    activeTimers: new Map(),
    timerCounter: 0,
  };

  // Link attachments to the registry for this test file + scenario
  if (!attachmentRegistry.has(testPath)) {
    attachmentRegistry.set(testPath, new Map());
  }
  attachmentRegistry.get(testPath)!.set(meta.scenario, activeContext.attachments);
}

// ============================================================================
// Step Wrappers: story.fn() and story.expect()
// ============================================================================

/**
 * Wrap a function body as a step. Records the step with timing and `wrapped: true`.
 * Supports both sync and async functions. Returns whatever the function returns.
 *
 * @param keyword - The BDD keyword (Given, When, Then, And, But)
 * @param text - Step description
 * @param body - The function to execute
 * @returns The return value of body (or a Promise of it if body is async)
 *
 * @example
 * ```ts
 * const data = story.fn('Given', 'setup data', () => ({ a: 5, b: 3 }));
 * const result = await story.fn('When', 'call API', async () => fetch('/api'));
 * ```
 */
function fn<T>(keyword: StepKeyword, text: string, body: () => T): T {
  const ctx = getContext();

  const step: StoryStep = {
    id: `step-${ctx.stepCounter++}`,
    keyword,
    text,
    docs: [],
    wrapped: true,
  };

  ctx.meta.steps.push(step);
  ctx.currentStep = step;

  const start = performance.now();

  try {
    const result = body();

    // Handle async functions
    if (result instanceof Promise) {
      return result.then(
        (val) => {
          step.durationMs = performance.now() - start;
          return val;
        },
        (err) => {
          step.durationMs = performance.now() - start;
          throw err;
        },
      ) as T;
    }

    step.durationMs = performance.now() - start;
    return result;
  } catch (err) {
    step.durationMs = performance.now() - start;
    throw err;
  }
}

/**
 * Wrap an assertion as a Then step. Shorthand for `story.fn('Then', text, body)`.
 *
 * @param text - Step description
 * @param body - The assertion function to execute
 *
 * @example
 * ```ts
 * story.expect('the result is 8', () => { expect(result).toBe(8); });
 * ```
 */
function storyExpect<T>(text: string, body: () => T): T {
  return fn('Then', text, body);
}

// ============================================================================
// Export story object
// ============================================================================

/**
 * The main story API object for Jest.
 *
 * @example
 * ```ts
 * import { story } from 'executable-stories-jest';
 *
 * describe('Calculator', () => {
 *   it('adds two numbers', () => {
 *     story.init();
 *
 *     story.given('two numbers 5 and 3');
 *     const a = 5, b = 3;
 *
 *     story.when('I add them together');
 *     const result = a + b;
 *
 *     story.then('the result is 8');
 *     expect(result).toBe(8);
 *   });
 * });
 * ```
 */
export const story = {
  // Jest-specific init
  init,

  // BDD step markers
  given: createStepMarker("Given"),
  when: createStepMarker("When"),
  then: createStepMarker("Then"),
  and: createStepMarker("And"),
  but: createStepMarker("But"),

  // AAA pattern aliases
  arrange: createStepMarker("Given"),
  act: createStepMarker("When"),
  assert: createStepMarker("Then"),

  // Additional aliases
  setup: createStepMarker("Given"),
  context: createStepMarker("Given"),
  execute: createStepMarker("When"),
  action: createStepMarker("When"),
  verify: createStepMarker("Then"),

  // Standalone doc methods
  note(text: string): void {
    attachDoc({ kind: "note", text, phase: "runtime" });
  },

  tag(name: string | string[]): void {
    const names = Array.isArray(name) ? name : [name];
    attachDoc({ kind: "tag", names, phase: "runtime" });
  },

  kv(options: KvOptions): void {
    attachDoc({ kind: "kv", label: options.label, value: options.value, phase: "runtime" });
  },

  json(options: JsonOptions): void {
    const content = JSON.stringify(options.value, null, 2);
    attachDoc({ kind: "code", label: options.label, content, lang: "json", phase: "runtime" });
  },

  code(options: CodeOptions): void {
    attachDoc({ kind: "code", label: options.label, content: options.content, lang: options.lang, phase: "runtime" });
  },

  table(options: TableOptions): void {
    attachDoc({ kind: "table", label: options.label, columns: options.columns, rows: options.rows, phase: "runtime" });
  },

  link(options: LinkOptions): void {
    attachDoc({ kind: "link", label: options.label, url: options.url, phase: "runtime" });
  },

  section(options: SectionOptions): void {
    attachDoc({ kind: "section", title: options.title, markdown: options.markdown, phase: "runtime" });
  },

  mermaid(options: MermaidOptions): void {
    attachDoc({ kind: "mermaid", code: options.code, title: options.title, phase: "runtime" });
  },

  screenshot(options: ScreenshotOptions): void {
    attachDoc({ kind: "screenshot", path: options.path, alt: options.alt, phase: "runtime" });
  },

  custom(options: CustomOptions): void {
    attachDoc({ kind: "custom", type: options.type, data: options.data, phase: "runtime" });
  },

  // Attachments
  attach(options: AttachmentOptions): void {
    const ctx = getContext();
    const stepIndex = ctx.currentStep
      ? ctx.meta.steps.indexOf(ctx.currentStep)
      : undefined;
    ctx.attachments.push({
      ...options,
      stepIndex: stepIndex !== undefined && stepIndex >= 0 ? stepIndex : undefined,
      stepId: ctx.currentStep?.id,
    });
  },

  // Step wrappers
  fn,
  expect: storyExpect,

  // Step timing
  startTimer(): number {
    const ctx = getContext();
    const token = ctx.timerCounter++;
    const stepIndex = ctx.currentStep
      ? ctx.meta.steps.indexOf(ctx.currentStep)
      : undefined;
    ctx.activeTimers.set(token, {
      start: performance.now(),
      stepIndex: stepIndex !== undefined && stepIndex >= 0 ? stepIndex : undefined,
      stepId: ctx.currentStep?.id,
      consumed: false,
    });
    return token;
  },

  endTimer(token: number): void {
    const ctx = getContext();
    const entry = ctx.activeTimers.get(token);
    if (!entry || entry.consumed) return;

    entry.consumed = true;
    const durationMs = performance.now() - entry.start;

    let step: StoryStep | undefined;
    if (entry.stepId) {
      step = ctx.meta.steps.find((s) => s.id === entry.stepId);
    }
    if (!step && entry.stepIndex !== undefined) {
      step = ctx.meta.steps[entry.stepIndex];
    }

    if (step) {
      step.durationMs = durationMs;
    }
  },
};

export type Story = typeof story;

// ============================================================================
// Internal exports for setup file
// ============================================================================

/**
 * Internal API for the setup file and tests. Not for public use.
 * @internal
 */
export const _internal = {
  flushStories,
  /** Clear active context (for tests that assert getContext() throws). */
  clearContext(): void {
    activeContext = null;
  },
};
