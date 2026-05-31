/**
 * Playwright story.* API for executable-stories.
 *
 * Uses native Playwright test() with opt-in documentation:
 *
 * @example
 * ```ts
 * import { test, expect } from '@playwright/test';
 * import { story } from 'executable-stories-playwright';
 *
 * test.describe('Calculator', () => {
 *   test('adds two numbers', async ({ page }, testInfo) => {
 *     story.init(testInfo);
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

import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TestInfo, PlaywrightTestArgs, PlaywrightTestOptions } from '@playwright/test';
import {
  tryGetActiveOtelContext,
  resolveTraceUrl,
} from 'executable-stories-formatters';
import type {
  StepKeyword,
  StoryMeta,
  StoryStep,
  DocEntry,
  NormalizedTicket,
  TicketInput,
} from './types';
import type {
  StoryDocs,
  StoryOptions,
  AttachmentOptions,
  ScopedAttachment,
  KvOptions,
  JsonOptions,
  CodeOptions,
  TableOptions,
  LinkOptions,
  SectionOptions,
  MermaidOptions,
  ScreenshotOptions,
  CustomOptions,
  ConsoleOptions,
  ObservePageErrorsOptions,
} from './types';
import { runStep, isAsyncFunction } from './step-runner';
import type { TestStepInfo } from './step-runner';

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
// Internal types
// ============================================================================

/** Fixture type for step callbacks: Playwright test args + options; custom extend() fixtures as unknown. */
type PlaywrightFixtures = PlaywrightTestArgs & PlaywrightTestOptions & Record<string, unknown>;

interface TimerEntry {
  start: number;
  stepIndex?: number;
  stepId?: string;
  consumed: boolean;
}

interface StoryContext {
  meta: StoryMeta;
  currentStep: StoryStep | null;
  stepCounter: number;
  attachments: ScopedAttachment[];
  activeTimers: Map<number, TimerEntry>;
  timerCounter: number;
  fixtures?: Record<string, unknown>;
}

// ============================================================================
// Playwright-specific context
// ============================================================================

/** Active story context - set by story.init() */
let activeContext: StoryContext | null = null;

/** Reference to testInfo for attaching metadata */
let activeTestInfo: TestInfo | null = null;

/** Counter to track source order of stories (increments on each story.init call) */
let sourceOrderCounter = 0;

/**
 * Get the current story context. Throws if story.init() wasn't called.
 */
function getContext(): StoryContext {
  if (!activeContext) {
    throw new Error(
      "story.init(testInfo) must be called first. Use: test('name', async ({ page }, testInfo) => { story.init(testInfo); ... });",
    );
  }
  return activeContext;
}

// ============================================================================
// Helper functions (inlined from core)
// ============================================================================

function normalizeTickets(
  ticket: TicketInput | TicketInput[] | undefined,
): NormalizedTicket[] | undefined {
  if (!ticket) return undefined;
  const arr = Array.isArray(ticket) ? ticket : [ticket];
  return arr.map((t) => (typeof t === 'string' ? { id: t } : t));
}

function convertStoryDocsToEntries(docs: StoryDocs): DocEntry[] {
  const entries: DocEntry[] = [];

  if (docs.note) {
    entries.push({ kind: 'note', text: docs.note, phase: 'runtime' });
  }
  if (docs.tag) {
    const names = Array.isArray(docs.tag) ? docs.tag : [docs.tag];
    entries.push({ kind: 'tag', names, phase: 'runtime' });
  }
  if (docs.kv) {
    for (const [label, value] of Object.entries(docs.kv)) {
      entries.push({ kind: 'kv', label, value, phase: 'runtime' });
    }
  }
  if (docs.code) {
    entries.push({
      kind: 'code',
      label: docs.code.label,
      content: docs.code.content,
      lang: docs.code.lang,
      phase: 'runtime',
    });
  }
  if (docs.json) {
    entries.push({
      kind: 'code',
      label: docs.json.label,
      content: JSON.stringify(docs.json.value, null, 2),
      lang: 'json',
      phase: 'runtime',
    });
  }
  if (docs.table) {
    entries.push({
      kind: 'table',
      label: docs.table.label,
      columns: docs.table.columns,
      rows: docs.table.rows,
      phase: 'runtime',
    });
  }
  if (docs.link) {
    entries.push({
      kind: 'link',
      label: docs.link.label,
      url: docs.link.url,
      phase: 'runtime',
    });
  }
  if (docs.section) {
    entries.push({
      kind: 'section',
      title: docs.section.title,
      markdown: docs.section.markdown,
      phase: 'runtime',
    });
  }
  if (docs.mermaid) {
    entries.push({
      kind: 'mermaid',
      code: docs.mermaid.code,
      title: docs.mermaid.title,
      phase: 'runtime',
    });
  }
  if (docs.screenshot) {
    entries.push({
      kind: 'screenshot',
      path: docs.screenshot.path,
      alt: docs.screenshot.alt,
      phase: 'runtime',
    });
  }
  if (docs.custom) {
    entries.push({
      kind: 'custom',
      type: docs.custom.type,
      data: docs.custom.data,
      phase: 'runtime',
    });
  }

  return entries;
}

const SCREENSHOT_MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  bmp: 'image/bmp',
};

/**
 * Read a screenshot file and return a `data:` URI; fall back to the original
 * path on any failure (remote URL, missing file, unknown extension).
 */
function inlineScreenshotIfPossible(filePath: string): string {
  if (/^(?:https?:|data:)/i.test(filePath)) return filePath;
  try {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = SCREENSHOT_MIME_BY_EXT[ext];
    if (!mime) return filePath;
    if (!fs.existsSync(filePath)) return filePath;
    const buf = fs.readFileSync(filePath);
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return filePath;
  }
}

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
  syncAnnotationToTest();
  return entry;
}

// ============================================================================
// Suite path extraction
// ============================================================================

/**
 * Extract the suite path from testInfo.titlePath.
 * Playwright's titlePath includes: [projectName, ...describeTitles, testTitle]
 * We want just the describe titles (excluding project and test name).
 */
function extractSuitePath(testInfo: TestInfo): string[] | undefined {
  const titlePath = testInfo.titlePath;
  if (titlePath.length <= 2) {
    return undefined;
  }
  const suitePath = titlePath.slice(1, -1);
  return suitePath.length > 0 ? suitePath : undefined;
}

// ============================================================================
// Step markers
// ============================================================================

function createStepMarker(keyword: StepKeyword) {
  function stepMarker(text: string, docs?: StoryDocs): void;
  function stepMarker(text: string, children: DocEntry[]): void;
  function stepMarker<T>(text: string, body: (fixtures: PlaywrightFixtures, step?: TestStepInfo) => T): T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function stepMarker<T>(text: string, docsOrBody?: StoryDocs | DocEntry[] | ((...args: any[]) => T)): T | void {
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
    syncAnnotationToTest();

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
      syncAnnotationToTest();
      return;
    }

    if (!isCallback) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = docsOrBody as (fixtures?: PlaywrightFixtures, stepInfo?: TestStepInfo) => T;
    const label = `${step.keyword}: ${text}`;
    const start = performance.now();

    // ── Async or stepInfo-aware callbacks: route through runStep() for Playwright-native integrations ──
    // Integrations: screencast chapters (v1.59), test.step/TestStepInfo (v1.51),
    // tracing.group (v1.49). Activated when fixtures are available AND either:
    //   1. callback is an async function, OR
    //   2. callback expects TestStepInfo (arity >= 2)
    if (ctx.fixtures !== undefined && (isAsyncFunction(body) || body.length >= 2)) {
      const fixtures = ctx.fixtures as Record<string, unknown>;
      const result = runStep(
        label,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body as unknown as (fixtures: Record<string, unknown>, step?: TestStepInfo) => Promise<any>,
        fixtures,
      );
      return result.then(
        (val: T) => { step.durationMs = performance.now() - start; syncAnnotationToTest(); return val; },
        (err: unknown) => { step.durationMs = performance.now() - start; syncAnnotationToTest(); throw err; },
      ) as T;
    }

    // ── Sync callbacks or no-fixture context: existing behaviour ─────────────
    try {
      const result = ctx.fixtures !== undefined ? body(ctx.fixtures as PlaywrightFixtures) : body();
      if (result instanceof Promise) {
        return result.then(
          (val) => { step.durationMs = performance.now() - start; syncAnnotationToTest(); return val; },
          (err) => { step.durationMs = performance.now() - start; syncAnnotationToTest(); throw err; },
        ) as T;
      }
      step.durationMs = performance.now() - start;
      syncAnnotationToTest();
      return result;
    } catch (err) {
      step.durationMs = performance.now() - start;
      syncAnnotationToTest();
      throw err;
    }
  }
  return stepMarker;
}

// ============================================================================
// story.init() - Playwright-specific
// ============================================================================

function isTestInfo(x: unknown): x is TestInfo {
  return (
    typeof x === 'object' &&
    x !== null &&
    'title' in x &&
    'annotations' in x &&
    Array.isArray((x as TestInfo).annotations)
  );
}

/** init(testInfo) or init(fixtures, testInfo) or init(testInfo, { fixtures }). */
function init(
  first: TestInfo | unknown,
  second?: StoryOptions | TestInfo,
  third?: StoryOptions,
): void {
  let testInfo: TestInfo;
  let options: StoryOptions | undefined;
  let fixtures: unknown;

  if (second !== undefined && isTestInfo(second)) {
    fixtures = first;
    testInfo = second;
    options = third;
  } else {
    testInfo = first as TestInfo;
    options = second;
    fixtures = options?.fixtures;
  }

  const meta: StoryMeta = {
    scenario: testInfo.title,
    steps: [],
    suitePath: extractSuitePath(testInfo),
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
        span.setAttribute('story.scenario', testInfo.title);
        if (options?.tags?.length) span.setAttribute('story.tags', options.tags);
        if (options?.ticket) {
          const tickets = Array.isArray(options.ticket) ? options.ticket : [options.ticket];
          span.setAttribute('story.tickets', tickets.map((t) => typeof t === 'string' ? t : t.id));
        }
      }
    } catch { /* OTel not available */ }
  }

  testInfo.annotations.push({
    type: 'story-meta',
    description: JSON.stringify(meta),
  });

  // ── Feature: Tag sync (v1.43) ─────────────────────────────────────────────
  // Sync story tags to Playwright's native annotation system so they appear in
  // UI Mode tag filters and the HTML reporter's tag display.
  for (const tag of options?.tags ?? []) {
    testInfo.annotations.push({ type: 'tag', description: tag });
  }

  activeContext = {
    meta,
    currentStep: null,
    stepCounter: 0,
    attachments: [],
    activeTimers: new Map(),
    timerCounter: 0,
    fixtures: fixtures as Record<string, unknown> | undefined,
  };
  activeTestInfo = testInfo;
}

/**
 * Update the story-meta annotation on testInfo with the current meta (including steps).
 * Called after each step/doc so the reporter sees the full story in onTestEnd.
 */
function syncAnnotationToTest(): void {
  if (!activeTestInfo || !activeContext) return;
  const annotation = activeTestInfo.annotations.find(
    (a) => a.type === 'story-meta',
  );
  if (annotation) {
    annotation.description = JSON.stringify(activeContext.meta);
  }
}

// ============================================================================
// story.fn() and story.expect()
// ============================================================================

/**
 * Wrap a function as a step with timing and error capture.
 * Records the step with `wrapped: true` and `durationMs`.
 */
function fn<T>(keyword: StepKeyword, text: string, body: (fixtures: PlaywrightFixtures) => T): T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
function fn<T>(keyword: StepKeyword, text: string, body: (...args: any[]) => T): T {
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
  syncAnnotationToTest();

  const start = performance.now();
  try {
    const result = ctx.fixtures !== undefined ? body(ctx.fixtures as PlaywrightFixtures) : body();
    if (result instanceof Promise) {
      return result.then(
        (val) => {
          step.durationMs = performance.now() - start;
          syncAnnotationToTest();
          return val;
        },
        (err) => {
          step.durationMs = performance.now() - start;
          syncAnnotationToTest();
          throw err;
        },
      ) as T;
    }
    step.durationMs = performance.now() - start;
    syncAnnotationToTest();
    return result;
  } catch (err) {
    step.durationMs = performance.now() - start;
    syncAnnotationToTest();
    throw err;
  }
}

/**
 * Wrap an assertion as a Then step with timing and error capture.
 * Shorthand for `story.fn('Then', text, body)`.
 */
function storyExpect<T>(text: string, body: () => T): T {
  return fn('Then', text, body);
}

// ============================================================================
// Playwright-specific attach
// ============================================================================

function playwrightAttach(options: AttachmentOptions): void {
  const ctx = getContext();
  const stepIndex = ctx.currentStep
    ? ctx.meta.steps.indexOf(ctx.currentStep)
    : undefined;
  ctx.attachments.push({
    ...options,
    stepId: ctx.currentStep?.id,
  });
  syncAnnotationToTest();

  if (activeTestInfo) {
    const attachOptions: { name: string; contentType: string; path?: string; body?: string | Buffer } = {
      name: options.name,
      contentType: options.mediaType,
    };
    if (options.path) attachOptions.path = options.path;
    if (options.body) attachOptions.body = options.body;
    activeTestInfo.attach(options.name, attachOptions);
  }
}

// ============================================================================
// Export story object
// ============================================================================

export const story = {
  init,

  // BDD step markers
  given: createStepMarker('Given'),
  when: createStepMarker('When'),
  then: createStepMarker('Then'),
  and: createStepMarker('And'),
  but: createStepMarker('But'),

  // AAA pattern aliases
  arrange: createStepMarker('Given'),
  act: createStepMarker('When'),
  assert: createStepMarker('Then'),

  // Additional aliases
  setup: createStepMarker('Given'),
  context: createStepMarker('Given'),
  execute: createStepMarker('When'),
  action: createStepMarker('When'),
  verify: createStepMarker('Then'),

  // Standalone doc methods
  note(text: string, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: 'note', text, phase: 'runtime' }, children);
  },

  tag(name: string | string[], children?: DocEntry[]): DocEntry {
    const names = Array.isArray(name) ? name : [name];
    return attachDoc({ kind: 'tag', names, phase: 'runtime' }, children);
  },

  kv(options: KvOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: 'kv', label: options.label, value: options.value, phase: 'runtime' }, children);
  },

  json(options: JsonOptions, children?: DocEntry[]): DocEntry {
    const content = JSON.stringify(options.value, null, 2);
    return attachDoc({ kind: 'code', label: options.label, content, lang: 'json', phase: 'runtime' }, children);
  },

  code(options: CodeOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: 'code', label: options.label, content: options.content, lang: options.lang, phase: 'runtime' }, children);
  },

  table(options: TableOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: 'table', label: options.label, columns: options.columns, rows: options.rows, phase: 'runtime' }, children);
  },

  link(options: LinkOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: 'link', label: options.label, url: options.url, phase: 'runtime' }, children);
  },

  section(options: SectionOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: 'section', title: options.title, markdown: options.markdown, phase: 'runtime' }, children);
  },

  mermaid(options: MermaidOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: 'mermaid', code: options.code, title: options.title, phase: 'runtime' }, children);
  },

  screenshot(options: ScreenshotOptions, children?: DocEntry[]): DocEntry {
    // Inline file bytes as a `data:` URI so the screenshot survives Playwright's
    // per-test outputDir cleanup (passing tests have their `test-results/<test>/`
    // directory deleted before the formatter runs). Falls back to the original
    // path for remote URLs or unreadable files.
    const resolvedPath = inlineScreenshotIfPossible(options.path);
    return attachDoc({ kind: 'screenshot', path: resolvedPath, alt: options.alt, phase: 'runtime' }, children);
  },

  custom(options: CustomOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: 'custom', type: options.type, data: options.data, phase: 'runtime' }, children);
  },

  // ── Feature: Console capture (v1.56) ────────────────────────────────────
  /**
   * Snapshot the current page console messages (and optionally page errors)
   * and attach them as a code doc entry.
   *
   * Uses page.consoleMessages() and page.pageErrors() introduced in Playwright v1.56.
   * Safe to call on any Playwright version – silently produces empty output if the
   * APIs are not present.
   *
   * @example
   * story.when('the form is submitted', async ({ page }) => {
   *   await page.click('#submit');
   *   story.console({ page, label: 'Submit console output' });
   * });
   */
  console(options: ConsoleOptions, children?: DocEntry[]): DocEntry {
    const p = options.page as {
      consoleMessages?: () => Array<{ type(): string; text(): string }>;
      pageErrors?: () => Error[];
    };

    const lines: string[] = [];

    if (typeof p?.consoleMessages === 'function') {
      for (const msg of p.consoleMessages()) {
        lines.push(`[${msg.type()}] ${msg.text()}`);
      }
    }

    if (options.includeErrors === true && typeof p?.pageErrors === 'function') {
      for (const err of p.pageErrors()) {
        lines.push(`[error] ${err.message}`);
      }
    }

    return attachDoc(
      {
        kind: 'code',
        label: options.label ?? 'Console',
        content: lines.length > 0 ? lines.join('\n') : '(no console output)',
        lang: 'log',
        phase: 'runtime',
      },
      children,
    );
  },

  /**
   * Capture current page runtime errors and attach as a structured doc entry.
   *
   * Collects from Playwright v1.56+ page.pageErrors() and page.consoleMessages().
   * This is intentionally snapshot-based so tests can call it at critical points
   * (after submit, after navigation) and keep evidence near relevant steps.
   */
  observePageErrors(options: ObservePageErrorsOptions, children?: DocEntry[]): DocEntry {
    const p = options.page as {
      consoleMessages?: () => Array<{ type(): string; text(): string }>;
      pageErrors?: () => Error[];
    };
    const ignore = options.ignore ?? [];
    const lines: string[] = [];

    if (typeof p?.pageErrors === 'function') {
      for (const err of p.pageErrors()) {
        const msg = err?.message ?? String(err);
        if (!ignore.some((rx) => rx.test(msg))) lines.push(`[pageerror] ${msg}`);
      }
    }
    if (typeof p?.consoleMessages === 'function') {
      for (const msg of p.consoleMessages()) {
        if (msg.type() !== 'error') continue;
        const text = msg.text();
        if (!ignore.some((rx) => rx.test(text))) lines.push(`[console.error] ${text}`);
      }
    }

    return attachDoc(
      {
        kind: 'code',
        label: options.label ?? 'Browser Runtime Errors',
        content: lines.length > 0 ? lines.join('\n') : '(no runtime errors observed)',
        lang: 'log',
        phase: 'runtime',
      },
      children,
    );
  },

  // Attachments
  attach: playwrightAttach,

  // OTel span attachment
  attachSpans(spans: ReadonlyArray<Record<string, unknown>>): void {
    if (!activeTestInfo) return;
    const existing = activeTestInfo.annotations.find(
      (a) => a.type === 'story-otel-spans',
    );
    const description = JSON.stringify(spans);
    if (existing) {
      existing.description = description;
    } else {
      activeTestInfo.annotations.push({
        type: 'story-otel-spans',
        description,
      });
    }
  },

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
    syncAnnotationToTest();
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
    syncAnnotationToTest();
  },

  // Step wrappers
  fn,
  expect: storyExpect,
};

export type Story = typeof story;
