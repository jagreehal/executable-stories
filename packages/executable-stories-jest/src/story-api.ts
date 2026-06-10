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
import { tryGetActiveOtelContext, resolveTraceUrl, buildHtmlDocEntry } from 'executable-stories-formatters';
import type {
  DocEntry,
  NormalizedTicket,
  StepKeyword,
  StoryDocs,
  StoryMeta,
  StoryOptions,
  StoryStep,
  ScopedAttachment,
  AttachmentOptions,
  TicketInput,
  KvOptions,
  JsonOptions,
  CodeOptions,
  TableOptions,
  LinkOptions,
  SectionOptions,
  MermaidOptions,
  ScreenshotOptions,
  VideoOptions,
  HtmlOptions,
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
  TicketInput,
  NormalizedTicket,
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
  /** Test file path for registry lookups */
  testPath: string;
  /** Index into the storyRegistry array for this scenario */
  scenarioIndex: number;
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

/** Attachments collected per story, keyed by test file path → scenario index → attachments */
const attachmentRegistry = new Map<string, Map<number, ScopedAttachment[]>>();

/** OTel spans collected per story, keyed by test file path → scenario index → spans */
const otelSpansRegistry = new Map<string, Map<number, ReadonlyArray<Record<string, unknown>>>>();

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

    // Include attachments and otelSpans per scenario (keyed by index, not name)
    const fileAttachments = attachmentRegistry.get(testFilePath);
    const fileOtelSpans = otelSpansRegistry.get(testFilePath);
    const scenariosWithAttachments = scenarios.map((s, i) => ({
      ...s,
      _attachments: fileAttachments?.get(i) ?? [],
      ...(fileOtelSpans?.get(i) ? { _otelSpans: fileOtelSpans.get(i) } : {}),
    }));

    const payload = { testFilePath, scenarios: scenariosWithAttachments };
    fs.writeFileSync(outFile, JSON.stringify(payload, null, 2) + "\n", "utf8");
  }
  storyRegistry.clear();
  attachmentRegistry.clear();
  otelSpansRegistry.clear();
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
 * Normalize ticket option to array of NormalizedTicket objects.
 */
function normalizeTickets(
  ticket: TicketInput | TicketInput[] | undefined,
): NormalizedTicket[] | undefined {
  if (!ticket) return undefined;
  const arr = Array.isArray(ticket) ? ticket : [ticket];
  return arr.map((t) => (typeof t === 'string' ? { id: t } : t));
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
  if (docs.video) {
    entries.push({ kind: "video", path: docs.video.path, caption: docs.video.caption, poster: docs.video.poster, phase: "runtime" });
  }
  if (docs.html) {
    entries.push(buildHtmlDocEntry(docs.html));
  }
  if (docs.custom) {
    entries.push({ kind: "custom", type: docs.custom.type, data: docs.custom.data, phase: "runtime" });
  }

  return entries;
}

// ============================================================================
// Helper to attach doc entry to current step or story-level
// ============================================================================

function attachDoc(entry: DocEntry, children?: DocEntry[]): DocEntry {
  const ctx = getContext();
  if (children && children.length > 0) {
    entry.children = children;
    const childSet = new Set<DocEntry>(children);
    const filterDocs = (docs: DocEntry[]) => docs.filter((d) => !childSet.has(d));
    // Remove children from ALL containers (story-level + every step)
    ctx.meta.docs = filterDocs(ctx.meta.docs ?? []);
    for (const step of ctx.meta.steps) {
      if (step.docs) step.docs = filterDocs(step.docs);
    }
  }
  if (ctx.currentStep) {
    ctx.currentStep.docs ??= [];
    ctx.currentStep.docs.push(entry);
  } else {
    ctx.meta.docs ??= [];
    ctx.meta.docs.push(entry);
  }
  return entry;
}

// ============================================================================
// Step Markers
// ============================================================================

function createStepMarker(keyword: StepKeyword) {
  function stepMarker(text: string, docs?: StoryDocs): void;
  function stepMarker(text: string, children: DocEntry[]): void;
  function stepMarker<T>(text: string, body: () => T): T;
  function stepMarker<T>(text: string, docsOrBody?: StoryDocs | DocEntry[] | (() => T)): T | void {
    const ctx = getContext();
    const isCallback = typeof docsOrBody === 'function';
    const isChildrenArray = Array.isArray(docsOrBody);

    const resolvedKeyword: StepKeyword =
      (keyword === 'Given' || keyword === 'When' || keyword === 'Then') &&
      ctx.meta.steps.some((s) => s.keyword === keyword)
        ? 'And'
        : keyword;

    let stepDocs: DocEntry[] = [];
    if (!isCallback && !isChildrenArray && docsOrBody) {
      stepDocs = convertStoryDocsToEntries(docsOrBody as StoryDocs);
    }

    const step: StoryStep = {
      id: `step-${ctx.stepCounter++}`,
      keyword: resolvedKeyword,
      text,
      docs: stepDocs,
      ...(isCallback ? { wrapped: true } : {}),
    };

    ctx.meta.steps.push(step);
    ctx.currentStep = step;

    // Handle DocEntry[] children: attach as step docs and deduplicate from story-level
    if (isChildrenArray) {
      const children = docsOrBody as DocEntry[];
      if (children.length > 0) {
        const childSet = new Set<DocEntry>(children);
        // Deduplicate from story-level docs
        ctx.meta.docs = (ctx.meta.docs ?? []).filter((d) => !childSet.has(d));
        // Deduplicate from step docs of earlier steps
        for (const prevStep of ctx.meta.steps) {
          if (prevStep !== step && prevStep.docs) {
            prevStep.docs = prevStep.docs.filter((d) => !childSet.has(d));
          }
        }
        step.docs = [...(step.docs ?? []), ...children];
      }
      return;
    }

    if (!isCallback) return;

    const body = docsOrBody as () => T;
    const start = performance.now();

    try {
      const result = body();
      if (result instanceof Promise) {
        return result.then(
          (val) => { step.durationMs = performance.now() - start; return val; },
          (err) => { step.durationMs = performance.now() - start; throw err; },
        ) as T;
      }
      step.durationMs = performance.now() - start;
      return result;
    } catch (err) {
      step.durationMs = performance.now() - start;
      throw err;
    }
  }
  return stepMarker;
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
    covers: options?.covers,
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
          span.setAttribute('story.tickets', tickets.map((t) => typeof t === 'string' ? t : t.id));
        }
      }
    } catch { /* OTel not available */ }
  }

  // Store in registry for this file
  const existing = storyRegistry.get(testPath);
  let scenarioIndex: number;
  if (existing) {
    scenarioIndex = existing.length;
    existing.push(meta);
  } else {
    scenarioIndex = 0;
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
    testPath,
    scenarioIndex,
  };

  // Link attachments to the registry for this test file + scenario index
  if (!attachmentRegistry.has(testPath)) {
    attachmentRegistry.set(testPath, new Map());
  }
  attachmentRegistry.get(testPath)!.set(scenarioIndex, activeContext.attachments);
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
  const resolvedKeyword: StepKeyword =
    (keyword === 'Given' || keyword === 'When' || keyword === 'Then') &&
    ctx.meta.steps.some((s) => s.keyword === keyword)
      ? 'And'
      : keyword;

  const step: StoryStep = {
    id: `step-${ctx.stepCounter++}`,
    keyword: resolvedKeyword,
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
  note(text: string, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: "note", text, phase: "runtime" }, children);
  },

  tag(name: string | string[], children?: DocEntry[]): DocEntry {
    const names = Array.isArray(name) ? name : [name];
    return attachDoc({ kind: "tag", names, phase: "runtime" }, children);
  },

  kv(options: KvOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: "kv", label: options.label, value: options.value, phase: "runtime" }, children);
  },

  json(options: JsonOptions, children?: DocEntry[]): DocEntry {
    const content = JSON.stringify(options.value, null, 2);
    return attachDoc({ kind: "code", label: options.label, content, lang: "json", phase: "runtime" }, children);
  },

  code(options: CodeOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: "code", label: options.label, content: options.content, lang: options.lang, phase: "runtime" }, children);
  },

  table(options: TableOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: "table", label: options.label, columns: options.columns, rows: options.rows, phase: "runtime" }, children);
  },

  link(options: LinkOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: "link", label: options.label, url: options.url, phase: "runtime" }, children);
  },

  section(options: SectionOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: "section", title: options.title, markdown: options.markdown, phase: "runtime" }, children);
  },

  mermaid(options: MermaidOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: "mermaid", code: options.code, title: options.title, phase: "runtime" }, children);
  },

  screenshot(options: ScreenshotOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: "screenshot", path: options.path, alt: options.alt, phase: "runtime" }, children);
  },

  video(options: VideoOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: "video", path: options.path, caption: options.caption, poster: options.poster, phase: "runtime" }, children);
  },

  html(options: HtmlOptions, children?: DocEntry[]): DocEntry {
    return attachDoc(buildHtmlDocEntry(options), children);
  },

  custom(options: CustomOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: "custom", type: options.type, data: options.data, phase: "runtime" }, children);
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

  // OTel span attachment
  attachSpans(spans: ReadonlyArray<Record<string, unknown>>): void {
    const ctx = getContext();
    if (!otelSpansRegistry.has(ctx.testPath)) {
      otelSpansRegistry.set(ctx.testPath, new Map());
    }
    otelSpansRegistry.get(ctx.testPath)!.set(ctx.scenarioIndex, spans);
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
