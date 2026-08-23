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
import { fileURLToPath } from 'node:url';
import type { TestInfo, PlaywrightTestArgs, PlaywrightTestOptions, Page } from '@playwright/test';
import { tryGetActiveOtelContext, resolveTraceUrl } from 'executable-stories-core/utils/otel-detect';
import { buildHtmlDocEntry } from 'executable-stories-core/utils/doc-builders';
import type {
  StepKeyword,
  StoryMeta,
  StoryStep,
  DocEntry,
  FeatureInput,
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
  StateOptions,
  CodeOptions,
  TableOptions,
  LinkOptions,
  SectionOptions,
  MermaidOptions,
  ScreenshotOptions,
  VideoOptions,
  HtmlOptions,
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
  /** Trace-link URL template, captured at init for later use by attachSpans. */
  traceUrlTemplate?: string;
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
  if (docs.state) {
    warnIfStateLarge(docs.state.label, docs.state.value);
    entries.push({
      kind: 'state',
      label: docs.state.label,
      value: docs.state.value,
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
    if (docs.screenshot.page) {
      throw new Error(
        'story.screenshot({ page }) is not supported inside inline step docs ' +
          '(e.g. story.then(text, { screenshot: { page } })) because capturing a ' +
          'screenshot is asynchronous and step markers run synchronously. Call ' +
          'story.screenshot({ page, alt }) as its own statement instead.',
      );
    }
    if (!docs.screenshot.path) {
      throw new Error('story docs screenshot requires a `path` (or use story.screenshot({ page }) instead).');
    }
    entries.push({
      kind: 'screenshot',
      // Inline file bytes as a `data:` URI here too — this is the same
      // capture-vs-cleanup race that story.screenshot() guards against, and
      // this path used to skip it, so a screenshot passed via inline step
      // docs would silently never embed no matter how the file was captured.
      path: inlineScreenshotIfPossible(docs.screenshot.path),
      alt: docs.screenshot.alt,
      phase: 'runtime',
    });
  }
  if (docs.video) {
    entries.push({
      kind: 'video',
      path: docs.video.path,
      caption: docs.video.caption,
      poster: docs.video.poster,
      phase: 'runtime',
    });
  }
  if (docs.html) {
    entries.push(buildHtmlEntry(docs.html));
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

/**
 * Capture-time inlining for the html doc kind. Playwright is the only adapter
 * that pre-resolves a source before building the entry; the exactly-one-of rule
 * and the entry shape come from the canonical `buildHtmlDocEntry`.
 *
 * An *absolute* local path (e.g. `/home/runner/work/.../x.html`, or anything
 * under `testInfo.outputPath()`) is read now and inlined as iframe srcdoc: that
 * path 404s once the HTML report is downloaded as a CI artifact and opened on
 * another machine, so we capture the bytes while they exist — the same
 * reasoning as screenshot data-URI inlining.
 *
 * A *relative* path is left as-is so it behaves exactly like the Vitest adapter:
 * the formatter reads it at format time (default), or copies it as a hashed
 * asset under `assetMode: "copy"`. Inlining relative paths early would needlessly
 * foreclose copy mode. The embedded HTML must be self-contained (single-file):
 * relative references to sibling CSS/JS are not rewritten (directory bundling is planned).
 */
function buildHtmlEntry(options: HtmlOptions): DocEntry {
  let { path: htmlPath, content } = options;
  // Only inline when `path` is the lone source: that keeps an invalid
  // multi-source call (e.g. path + content) reaching the canonical validator
  // instead of being silently "fixed" by overwriting content from disk. Listing
  // `htmlPath !== undefined` first in the chain narrows it for the rest.
  if (
    htmlPath !== undefined &&
    options.url === undefined &&
    content === undefined &&
    !/^https?:/i.test(htmlPath) &&
    path.isAbsolute(htmlPath)
  ) {
    try {
      if (fs.existsSync(htmlPath)) {
        content = fs.readFileSync(htmlPath, 'utf8');
        htmlPath = undefined;
      }
    } catch {
      // keep the path — the formatter retries at format time
    }
  }
  return buildHtmlDocEntry({ ...options, path: htmlPath, content });
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
 *
 * A missing/unreadable local path almost always means the screenshot was
 * never taken at that path — e.g. `story.screenshot({ path })` called without
 * a preceding `page.screenshot({ path })`, or the two paths drifted apart.
 * That failure otherwise surfaces minutes later as a broken image in a PR
 * comment or a "Screenshot unavailable" placeholder in the HTML report, far
 * from the line that caused it — so warn immediately, at the call site.
 */
function inlineScreenshotIfPossible(filePath: string): string {
  if (/^(?:https?:|data:)/i.test(filePath)) return filePath;
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = SCREENSHOT_MIME_BY_EXT[ext];
  if (!mime) return filePath;
  try {
    if (!fs.existsSync(filePath)) {
      warnScreenshotUnavailable(filePath);
      return filePath;
    }
    const buf = fs.readFileSync(filePath);
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (err) {
    warnScreenshotUnavailable(filePath, err);
    return filePath;
  }
}

function warnScreenshotUnavailable(filePath: string, cause?: unknown): void {
  const causeMessage = cause instanceof Error ? cause.message : cause ? String(cause) : undefined;
  console.warn(
    `[executable-stories-playwright] story.screenshot(): could not read "${filePath}" — ` +
      'the report will show a "Screenshot unavailable" placeholder instead of the image. ' +
      'Make sure a screenshot is written to this exact path before story.screenshot() runs ' +
      '(e.g. `await page.screenshot({ path })`), or capture it directly with ' +
      '`story.screenshot({ page, alt })`.' +
      (causeMessage ? ` Cause: ${causeMessage}` : ''),
  );
}

/**
 * story.video() never reads/inlines the file (video bytes are too large for
 * a `data:` URI) — it always defers to the formatter's asset bundler, which
 * runs later, at report-generation time. A *relative* path is legitimately
 * unresolvable yet (the bundler resolves it against the report output), so
 * this only warns for an *absolute* local path missing right now — that can
 * never resolve later either, since it's not relative to anything the
 * bundler controls. The most common cause: passing a path nothing has
 * written to (e.g. a typo, or the video hasn't finished flushing to disk —
 * see Playwright's `page.video()?.path()`, which resolves only after
 * `page.close()`).
 */
function warnIfAbsoluteVideoPathMissing(filePath: string): void {
  if (/^(?:https?:|data:)/i.test(filePath)) return;
  if (!path.isAbsolute(filePath)) return;
  if (fs.existsSync(filePath)) return;
  console.warn(
    `[executable-stories-playwright] story.video(): "${filePath}" does not exist yet. ` +
      'Video bytes are never inlined, so this exact path must resolve to a real file by the time the ' +
      'report is built, or the report will show a "Video unavailable" placeholder instead of the clip.',
  );
}

/**
 * Warn (non-fatal) when a state snapshot serializes past 100KB — the entry is
 * still recorded, but a projection is usually what the storyboard needs.
 */
function warnIfStateLarge(label: string | undefined, value: unknown): void {
  try {
    const len = JSON.stringify(value)?.length ?? 0;
    if (len > 100_000) {
      console.warn(
        `[executable-stories] state "${label ?? ''}" is ${Math.round(len / 1024)}KB — consider capturing a projection`,
      );
    }
  } catch {
    // Non-serializable value: recorded as-is, size unknown.
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

  // Flag the scenario so the reporter promotes the Playwright screen recording
  // into a featured inline video doc entry (see reporter onTestEnd).
  if (options?.featureVideo) {
    meta.meta = { ...meta.meta, featureVideo: true };
  }

  // OTel bridge: detect active span, flow data bidirectionally
  const traceUrlTemplate =
    options?.traceUrlTemplate ?? process.env.OTEL_TRACE_URL_TEMPLATE;
  const otelCtx = tryGetActiveOtelContext();
  if (otelCtx) {
    // OTel -> Story: capture traceId + docs from the active span.
    applyTraceToMeta(meta, otelCtx.traceId, otelCtx.spanId, traceUrlTemplate);

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

  const declaredFeature =
    declaredFeatures.get(fileKey(testInfo.file)) ?? declaredFeatures.get(UNRESOLVED_FILE);
  if (declaredFeature) {
    testInfo.annotations.push({
      type: 'story-feature',
      description: JSON.stringify(declaredFeature),
    });
  }

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
    traceUrlTemplate,
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

/**
 * Bridge an OTel trace into the story's meta + docs: structured `otel` meta, a
 * "Trace ID" key-value, and a "View Trace" link when the template resolves.
 * Idempotent — once a traceId is recorded it is not overwritten, so the
 * active-span path in init() and the explicit path in attachSpans() compose
 * without duplicating entries.
 */
function applyTraceToMeta(
  meta: StoryMeta,
  traceId: string,
  spanId: string | undefined,
  template: string | undefined,
): void {
  const existing = (meta.meta as { otel?: { traceId?: string } } | undefined)
    ?.otel;
  if (existing?.traceId) return;

  meta.meta = { ...meta.meta, otel: { traceId, spanId } };
  meta.docs = meta.docs ?? [];
  meta.docs.push({
    kind: 'kv',
    label: 'Trace ID',
    value: traceId,
    phase: 'runtime',
  });
  const url = resolveTraceUrl(template, traceId);
  if (url) {
    meta.docs.push({ kind: 'link', label: 'View Trace', url, phase: 'runtime' });
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
// story.screenshot() — capture-and-attach, or attach-an-existing-file
// ============================================================================

/**
 * Two ways to attach a screenshot:
 *  - `story.screenshot({ page, alt })` captures a fresh screenshot and inlines
 *    it directly from the in-memory buffer — no filesystem round-trip, so
 *    there's no path to fall out of sync and nothing for Playwright's output
 *    cleanup to delete before the report is built. Prefer this form.
 *  - `story.screenshot({ path, alt })` attaches a screenshot that already
 *    exists on disk (e.g. one taken earlier for another purpose). The caller
 *    is responsible for making sure something wrote a file to `path` first.
 */
function screenshotImpl(options: ScreenshotOptions & { page: Page }, children?: DocEntry[]): Promise<DocEntry>;
function screenshotImpl(
  options: ScreenshotOptions & { path: string; page?: undefined },
  children?: DocEntry[],
): DocEntry;
function screenshotImpl(options: ScreenshotOptions, children?: DocEntry[]): DocEntry | Promise<DocEntry> {
  if (options.page) {
    return options.page
      .screenshot(options.path ? { path: options.path, fullPage: options.fullPage ?? true } : { fullPage: options.fullPage ?? true })
      .then((buffer) => {
        const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;
        return attachDoc({ kind: 'screenshot', path: dataUri, alt: options.alt, phase: 'runtime' }, children);
      });
  }
  if (!options.path) {
    throw new Error('story.screenshot() requires either `path` (an existing file) or `page` (to capture one).');
  }
  // Inline file bytes as a `data:` URI so the screenshot survives Playwright's
  // per-test outputDir cleanup (passing tests have their `test-results/<test>/`
  // directory deleted before the formatter runs). Falls back to the original
  // path for remote URLs or unreadable files.
  const resolvedPath = inlineScreenshotIfPossible(options.path);
  return attachDoc({ kind: 'screenshot', path: resolvedPath, alt: options.alt, phase: 'runtime' }, children);
}

// ============================================================================
// Export story object
// ============================================================================

export const story = {
  init,
  feature,

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

  /**
   * Capture what the world looks like at this step: a JSON-serializable data
   * snapshot that becomes a storyboard frame. Consecutive states with the same
   * label are diffed downstream, so snapshot the same projection at each step.
   *
   * A step can carry BOTH a screenshot and a state — the screen and the
   * backend record for the same moment:
   *
   * @example
   * story.when('the user completes checkout');
   * await story.screenshot({ page, alt: 'Payment form' });
   * story.state({ label: 'order', value: { id: 1042, status: 'paid', total: '£25' } });
   */
  state(options: StateOptions, children?: DocEntry[]): DocEntry {
    warnIfStateLarge(options.label, options.value);
    return attachDoc({ kind: 'state', label: options.label, value: options.value, phase: 'runtime' }, children);
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

  screenshot: screenshotImpl,

  video(options: VideoOptions, children?: DocEntry[]): DocEntry {
    // Unlike screenshots, video bytes are never inlined as a data URI — they're
    // too large. The path is kept as-is so the formatter's asset bundler copies
    // the file into the report/docs site. Pass a path relative to the output, or
    // use `featureVideo: true` on story.init() to auto-promote the Playwright
    // recording instead.
    warnIfAbsoluteVideoPathMissing(options.path);
    return attachDoc(
      { kind: 'video', path: options.path, caption: options.caption, poster: options.poster, phase: 'runtime' },
      children,
    );
  },

  /**
   * Embed HTML in a sandboxed iframe in the current step or story-level docs.
   * Exactly one of path/url/content is required. Local files are inlined so
   * the report stays self-contained — the HTML must therefore be
   * self-contained too (use your tool's single-file mode); relative sub-asset
   * references won't resolve.
   * @example story.html({ path: './coverage/index.html', title: 'Coverage' })
   * @example story.html({ url: 'https://dash.example.com/run/42', height: 600 })
   * @example story.html({ content: chartHtml, title: 'Latency chart' })
   */
  html(options: HtmlOptions, children?: DocEntry[]): DocEntry {
    return attachDoc(buildHtmlEntry(options), children);
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
  attachSpans(
    spans: ReadonlyArray<Record<string, unknown>>,
    options?: { traceId?: string; spanId?: string },
  ): void {
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
    // Capture-then-attach: wire the trace badge + "View Trace" link when the
    // trace was created after init() (so the init-time bridge couldn't see it).
    if (options?.traceId && activeContext) {
      applyTraceToMeta(
        activeContext.meta,
        options.traceId,
        options.spanId,
        activeContext.traceUrlTemplate,
      );
      syncAnnotationToTest();
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

/**
 * Declarations by the spec file that made them.
 *
 * A worker loads one spec file at a time, but it is reused across files. A
 * single "last declaration wins" slot therefore hands file A's feature to file
 * B when B declares none of its own, and the reporter keys features by
 * `test.location.file`, so B ends up with a feature it never wrote. Keying on
 * the declaring file is what stops that.
 */
const declaredFeatures = new Map<string, FeatureInput>();

/**
 * One canonical key for a spec file, whichever way it reached us.
 *
 * Under ESM a V8 stack frame carries a file: URL, so the declaring file
 * arrives as `file:///C:/app/spec.ts` while `testInfo.file` is `C:\app\spec.ts`.
 * Compared as text those never match and the declaration is silently dropped.
 * Windows paths are also case-insensitive, and the two sources do not always
 * agree on the drive letter's case.
 */
function fileKey(raw: string): string {
  let file = raw;
  if (file.startsWith('file://')) {
    try {
      file = fileURLToPath(file);
    } catch {
      // Not a URL we can decode; fall through with the raw text.
    }
  }
  const resolved = path.resolve(file);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

/**
 * Best-effort source file of whoever called into this module.
 *
 * `story.feature(...)` runs at module scope, before any test is running, so
 * the stack is the only place the spec file is available at that point.
 */
function callerFile(): string | undefined {
  const stack = new Error().stack;
  if (!stack) return undefined;

  const files = stack
    .split('\n')
    .slice(1)
    .map((line) => {
      const match = /\(((?:file:\/\/)?[^()]+?):\d+:\d+\)/.exec(line)
        ?? /at ((?:file:\/\/)?[^()\s]+?):\d+:\d+/.exec(line);
      const file = match?.[1];
      // node: builtins are not files and must not be normalized into one.
      return file && !file.startsWith('node:') ? fileKey(file) : undefined;
    });

  // The first frame is this function, so its file is this module — in a build
  // that could be dist/index.js or src/story-api.ts. Comparing against it
  // beats matching the package name, which would also exclude a spec file
  // living inside this package (its own tests) or any user path that happens
  // to contain it.
  const self = files[0];
  return files.find((file) => file !== undefined && file !== self);
}

/**
 * Declare what the file's scenarios are for, before any of them run.
 *
 * Scenarios say what the system does. This says why the feature exists and who
 * it serves, so a reader meets the intent before the examples. Call it once per
 * spec file, at module scope or at the top of the outermost `test.describe`.
 *
 * @example
 * ```ts
 * story.feature({
 *   kind: 'ability',
 *   title: 'Shoppers can check out without an account',
 *   narrative: 'Forcing a signup before payment is where most carts are abandoned.',
 * });
 * ```
 */
function feature(input: FeatureInput): void {
  const file = callerFile();
  // Unresolvable file: keep the declaration rather than lose it silently, and
  // let the next test claim it. That is the old behaviour, now the exception.
  declaredFeatures.set(file ?? UNRESOLVED_FILE, input);
}

/** Bucket for a declaration whose file the stack could not name. */
const UNRESOLVED_FILE = '\0unresolved';
