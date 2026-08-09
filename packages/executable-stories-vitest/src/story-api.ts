/**
 * story.* API for executable-stories-vitest.
 *
 * Uses native Vitest describe/it/test with opt-in documentation:
 *
 * @example
 * ```ts
 * import { describe, it, expect } from 'vitest';
 * import { story } from 'executable-stories-vitest';
 *
 * describe('Calculator', () => {
 *   it('adds two numbers', ({ task }) => {
 *     story.init(task);
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
import { tryGetActiveOtelContext, resolveTraceUrl } from 'executable-stories-core/utils/otel-detect';
import { buildHtmlDocEntry } from 'executable-stories-core/utils/doc-builders';
import type {
  DocEntry,
  NormalizedTicket,
  StepKeyword,
  StoryDocs,
  StoryMeta,
  StoryOptions,
  StoryStep,
  TicketInput,
  VitestSuite,
} from './types';

// ============================================================================
// Task Interface (compatible with Vitest's actual task type)
// ============================================================================

/**
 * Minimal task interface compatible with Vitest's Test type.
 * The meta property accepts any object type to be compatible with Vitest's TaskMeta.
 */
interface TaskLike {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: any;
  suite?: VitestSuite;
  file?: { name?: string };
}

// ============================================================================
// Story Context
// ============================================================================

/** Attachment options for story.attach() */
export interface AttachmentOptions {
  name: string;
  mediaType: string;
  path?: string;
  body?: string;
  encoding?: "BASE64" | "IDENTITY";
  charset?: string;
  fileName?: string;
}

/** Internal: attachment with step scope */
interface ScopedAttachment extends AttachmentOptions {
  stepIndex?: number;
  stepId?: string;
}

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
  /** Reference to task.meta for updates */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  taskMeta: any;
  /** Deterministic step counter (resets per test case) */
  stepCounter: number;
  /** Collected attachments with step scope */
  attachments: ScopedAttachment[];
  /** Active timers keyed by token */
  activeTimers: Map<number, TimerEntry>;
  /** Monotonic timer token counter */
  timerCounter: number;
  /** Trace-link URL template, captured at init for later use by attachSpans. */
  traceUrlTemplate?: string;
}

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
      "story.init(task) must be called first. Use: it('name', ({ task }) => { story.init(task); ... });",
    );
  }
  return activeContext;
}

/** Re-attach current meta to task.meta.story so reporter sees steps and docs (e.g. story.note). */
function syncMetaToTask(): void {
  if (activeContext?.taskMeta) {
    activeContext.taskMeta.story = activeContext.meta;
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
    kind: "kv",
    label: "Trace ID",
    value: traceId,
    phase: "runtime",
  });
  const url = resolveTraceUrl(template, traceId);
  if (url) {
    meta.docs.push({ kind: "link", label: "View Trace", url, phase: "runtime" });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a name looks like a file path (to filter out from suite paths).
 */
function looksLikeFilePath(name: string): boolean {
  if (name.includes('/') || name.includes('\\')) return true;
  if (name.includes('.spec.') || name.includes('.test.')) return true;
  if (/\.(spec|test)\.(ts|js|mjs|cjs)$/.test(name)) return true;
  if (/\.(ts|js|mjs|cjs)$/.test(name)) return true;
  return false;
}

/**
 * Extract the suite path (parent describe names) from a Vitest task object.
 */
function extractSuitePath(task: TaskLike): string[] | undefined {
  const path: string[] = [];
  const fileName = task.file?.name;
  let current: VitestSuite | undefined = task.suite;

  while (current) {
    const name = current.name;
    if (
      name &&
      name.trim() !== '' &&
      name !== '<root>' &&
      name !== fileName &&
      !looksLikeFilePath(name)
    ) {
      path.unshift(name);
    }
    current = current.suite;
  }

  return path.length > 0 ? path : undefined;
}

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
 * Convert StoryDocs inline options to DocEntry array.
 * Matches the standalone DocApi method signatures.
 */
function convertStoryDocsToEntries(docs: StoryDocs): DocEntry[] {
  const entries: DocEntry[] = [];

  // note(text)
  if (docs.note) {
    entries.push({ kind: 'note', text: docs.note, phase: 'runtime' });
  }

  // tag(name | names)
  if (docs.tag) {
    const names = Array.isArray(docs.tag) ? docs.tag : [docs.tag];
    entries.push({ kind: 'tag', names, phase: 'runtime' });
  }

  // kv(label, value) - multiple pairs via Record
  if (docs.kv) {
    for (const [label, value] of Object.entries(docs.kv)) {
      entries.push({ kind: 'kv', label, value, phase: 'runtime' });
    }
  }

  // code(label, content, lang?)
  if (docs.code) {
    entries.push({
      kind: 'code',
      label: docs.code.label,
      content: docs.code.content,
      lang: docs.code.lang,
      phase: 'runtime',
    });
  }

  // json(label, value)
  if (docs.json) {
    entries.push({
      kind: 'code',
      label: docs.json.label,
      content: JSON.stringify(docs.json.value, null, 2),
      lang: 'json',
      phase: 'runtime',
    });
  }

  // state(label?, value)
  if (docs.state) {
    warnIfLargeState(docs.state.label, docs.state.value);
    entries.push({
      kind: 'state',
      label: docs.state.label,
      value: docs.state.value,
      phase: 'runtime',
    });
  }

  // table(label, columns, rows)
  if (docs.table) {
    entries.push({
      kind: 'table',
      label: docs.table.label,
      columns: docs.table.columns,
      rows: docs.table.rows,
      phase: 'runtime',
    });
  }

  // link(label, url)
  if (docs.link) {
    entries.push({
      kind: 'link',
      label: docs.link.label,
      url: docs.link.url,
      phase: 'runtime',
    });
  }

  // section(title, markdown)
  if (docs.section) {
    entries.push({
      kind: 'section',
      title: docs.section.title,
      markdown: docs.section.markdown,
      phase: 'runtime',
    });
  }

  // mermaid(code, title?)
  if (docs.mermaid) {
    entries.push({
      kind: 'mermaid',
      code: docs.mermaid.code,
      title: docs.mermaid.title,
      phase: 'runtime',
    });
  }

  // screenshot(path, alt?)
  if (docs.screenshot) {
    entries.push({
      kind: 'screenshot',
      path: docs.screenshot.path,
      alt: docs.screenshot.alt,
      phase: 'runtime',
    });
  }

  // video(path, caption?, poster?)
  if (docs.video) {
    entries.push({
      kind: 'video',
      path: docs.video.path,
      caption: docs.video.caption,
      poster: docs.video.poster,
      phase: 'runtime',
    });
  }

  // html(path | url | content, title?, height?)
  if (docs.html) {
    entries.push(buildHtmlDocEntry(docs.html));
  }

  // custom(type, data)
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

// ============================================================================
// story.init()
// ============================================================================

/**
 * Initialize a story for the current test.
 * Must be called at the start of each test that wants documentation.
 *
 * @param task - The Vitest task object from ({ task }) => { ... }
 * @param options - Optional story configuration (tags, ticket, meta)
 *
 * @example
 * ```ts
 * it('adds two numbers', ({ task }) => {
 *   story.init(task);
 *   // ... rest of test
 * });
 *
 * // With options:
 * it('admin deletes user', ({ task }) => {
 *   story.init(task, {
 *     tags: ['admin', 'destructive'],
 *     ticket: 'JIRA-456'
 *   });
 * });
 * ```
 */
function init(task: TaskLike, options?: StoryOptions): void {
  const meta: StoryMeta = {
    scenario: task.name,
    steps: [],
    suitePath: extractSuitePath(task),
    tags: options?.tags,
    tickets: normalizeTickets(options?.ticket),
    covers: options?.covers,
    meta: options?.meta,
    sourceOrder: sourceOrderCounter++,
  };

  // OTel bridge: detect active span, flow data bidirectionally
  const traceUrlTemplate =
    options?.traceUrlTemplate ?? process.env.OTEL_TRACE_URL_TEMPLATE;
  const otelCtx = tryGetActiveOtelContext();
  if (otelCtx) {
    // OTel -> Story: capture traceId + docs from the active span.
    applyTraceToMeta(meta, otelCtx.traceId, otelCtx.spanId, traceUrlTemplate);

    // Story -> OTel: enrich active span with story attributes
    try {
      const reqUrl = import.meta.url
        ?? (typeof __filename !== 'undefined' ? `file://${__filename}` : undefined);
      const req = createRequire(reqUrl!);
      const api = req('@opentelemetry/api');
      const span = api.trace?.getActiveSpan?.();
      if (span) {
        span.setAttribute('story.scenario', task.name);
        if (options?.tags?.length) span.setAttribute('story.tags', options.tags);
        if (options?.ticket) {
          const tickets = Array.isArray(options.ticket) ? options.ticket : [options.ticket];
          span.setAttribute('story.tickets', tickets.map((t) => typeof t === 'string' ? t : t.id));
        }
      }
    } catch { /* OTel not available */ }
  }

  // Attach to task.meta so reporter can find it
  task.meta.story = meta;

  // Set active context
  activeContext = {
    meta,
    currentStep: null,
    taskMeta: task.meta,
    stepCounter: 0,
    attachments: [],
    activeTimers: new Map(),
    timerCounter: 0,
    traceUrlTemplate,
  };
}

// ============================================================================
// Step Markers
// ============================================================================

/**
 * Create a step marker function for a given keyword.
 */
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
    syncMetaToTask();

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
      syncMetaToTask();
      return;
    }

    if (!isCallback) return;

    const body = docsOrBody as () => T;
    const start = performance.now();

    try {
      const result = body();
      if (result instanceof Promise) {
        return result.then(
          (val) => { step.durationMs = performance.now() - start; syncMetaToTask(); return val; },
          (err) => { step.durationMs = performance.now() - start; syncMetaToTask(); throw err; },
        ) as T;
      }
      step.durationMs = performance.now() - start;
      syncMetaToTask();
      return result;
    } catch (err) {
      step.durationMs = performance.now() - start;
      syncMetaToTask();
      throw err;
    }
  }
  return stepMarker;
}

// ============================================================================
// Doc Methods (Standalone)
// ============================================================================

/**
 * Add a free-text note to the current step or story-level if before any step.
 */
function note(text: string, children?: DocEntry[]): DocEntry {
  return attachDoc({ kind: 'note', text, phase: 'runtime' }, children);
}

// ============================================================================
// Doc Method Types (shared between standalone and inline)
// ============================================================================

/** Options for kv() - key-value pair */
interface KvOptions {
  label: string;
  value: unknown;
}

/** Options for json() - JSON code block */
interface JsonOptions {
  label: string;
  value: unknown;
}

/** Options for state() - data snapshot of the world at this step */
interface StateOptions {
  label?: string;
  value: unknown;
}

/** Options for code() - code block with optional language */
interface CodeOptions {
  label: string;
  content: string;
  lang?: string;
}

/** Options for table() - markdown table */
interface TableOptions {
  label: string;
  columns: string[];
  rows: string[][];
}

/** Options for link() - hyperlink */
interface LinkOptions {
  label: string;
  url: string;
}

/** Options for section() - titled markdown section */
interface SectionOptions {
  title: string;
  markdown: string;
}

/** Options for mermaid() - Mermaid diagram */
interface MermaidOptions {
  code: string;
  title?: string;
}

/** Options for screenshot() - screenshot reference */
interface ScreenshotOptions {
  path: string;
  alt?: string;
}

/** Options for video() - video reference */
interface VideoOptions {
  path: string;
  caption?: string;
  poster?: string;
}

/** Options for html() - HTML embedded in a sandboxed iframe */
interface HtmlOptions {
  /** Local HTML file path (inlined into the report by default) */
  path?: string;
  /** Remote URL rendered via iframe src */
  url?: string;
  /** Inline HTML content rendered via iframe srcdoc */
  content?: string;
  title?: string;
  /** Iframe height: number → px, string passed through (e.g. '60vh'). Default 400px. */
  height?: number | string;
}

/** Options for custom() - custom doc entry */
interface CustomOptions {
  type: string;
  data: unknown;
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
  syncMetaToTask();
  return entry;
}

// ============================================================================
// Doc Methods (Standalone) - same shape as inline docs
// ============================================================================

/**
 * Add a key-value pair to the current step or story-level.
 * @example story.kv({ label: 'Payment ID', value: 'pay_123' })
 */
function kv(options: KvOptions, children?: DocEntry[]): DocEntry {
  return attachDoc({
    kind: 'kv',
    label: options.label,
    value: options.value,
    phase: 'runtime',
  }, children);
}

/**
 * Add a JSON code block to the current step or story-level.
 * @example story.json({ label: 'Order', value: { id: 123 } })
 */
function json(options: JsonOptions, children?: DocEntry[]): DocEntry {
  const content = JSON.stringify(options.value, null, 2);
  return attachDoc({
    kind: 'code',
    label: options.label,
    content,
    lang: 'json',
    phase: 'runtime',
  }, children);
}

/** Warn (non-fatal) when a state snapshot is suspiciously large. */
function warnIfLargeState(label: string | undefined, value: unknown): void {
  try {
    const length = JSON.stringify(value)?.length ?? 0;
    if (length > 100_000) {
      console.warn(
        `[executable-stories] state "${label ?? 'state'}" is ${Math.round(length / 1024)}KB — consider capturing a projection of the entity instead of the whole thing`,
      );
    }
  } catch {
    /* non-serializable value; still recorded */
  }
}

/**
 * Capture what the world looks like at this step — a data snapshot that
 * becomes a storyboard frame in generated docs. Consecutive snapshots with
 * the same label get diffed downstream. The value must be JSON-serializable.
 * @example
 * ```ts
 * story.given('an empty basket');
 * story.state({ label: 'Basket', value: { items: [], total: 0 } });
 * story.when('a widget is added');
 * story.state({ label: 'Basket', value: { items: ['widget'], total: 49.99 } });
 * ```
 */
function state(options: StateOptions, children?: DocEntry[]): DocEntry {
  warnIfLargeState(options.label, options.value);
  return attachDoc({
    kind: 'state',
    label: options.label,
    value: options.value,
    phase: 'runtime',
  }, children);
}

/**
 * Add a code block with optional language to the current step or story-level.
 * @example story.code({ label: 'Config', content: 'port: 3000', lang: 'yaml' })
 */
function code(options: CodeOptions, children?: DocEntry[]): DocEntry {
  return attachDoc({
    kind: 'code',
    label: options.label,
    content: options.content,
    lang: options.lang,
    phase: 'runtime',
  }, children);
}

/**
 * Add a markdown table to the current step or story-level.
 * @example story.table({ label: 'Users', columns: ['Name', 'Role'], rows: [['Alice', 'Admin']] })
 */
function table(options: TableOptions, children?: DocEntry[]): DocEntry {
  return attachDoc({
    kind: 'table',
    label: options.label,
    columns: options.columns,
    rows: options.rows,
    phase: 'runtime',
  }, children);
}

/**
 * Add a hyperlink to the current step or story-level.
 * @example story.link({ label: 'API Docs', url: 'https://docs.example.com' })
 */
function link(options: LinkOptions, children?: DocEntry[]): DocEntry {
  return attachDoc({
    kind: 'link',
    label: options.label,
    url: options.url,
    phase: 'runtime',
  }, children);
}

/**
 * Add a titled section with markdown content to the current step or story-level.
 * @example story.section({ title: 'Details', markdown: 'This is **important**' })
 */
function section(options: SectionOptions, children?: DocEntry[]): DocEntry {
  return attachDoc({
    kind: 'section',
    title: options.title,
    markdown: options.markdown,
    phase: 'runtime',
  }, children);
}

/**
 * Add a Mermaid diagram to the current step or story-level.
 * @example story.mermaid({ code: 'graph LR; A-->B', title: 'Flow' })
 */
function mermaid(options: MermaidOptions, children?: DocEntry[]): DocEntry {
  return attachDoc({
    kind: 'mermaid',
    code: options.code,
    title: options.title,
    phase: 'runtime',
  }, children);
}

/**
 * Add a screenshot reference to the current step or story-level.
 * @example story.screenshot({ path: '/screenshots/result.png', alt: 'Final result' })
 */
function screenshot(options: ScreenshotOptions, children?: DocEntry[]): DocEntry {
  return attachDoc({
    kind: 'screenshot',
    path: options.path,
    alt: options.alt,
    phase: 'runtime',
  }, children);
}

/**
 * Add a video reference to the current step or story-level.
 * @example story.video({ path: '/videos/run.mp4', caption: 'Full run', poster: '/videos/run.jpg' })
 */
function video(options: VideoOptions, children?: DocEntry[]): DocEntry {
  return attachDoc({
    kind: 'video',
    path: options.path,
    caption: options.caption,
    poster: options.poster,
    phase: 'runtime',
  }, children);
}

/**
 * Embed HTML in a sandboxed iframe in the current step or story-level docs.
 * Exactly one of path/url/content is required. Local files are inlined into
 * the report by default so it stays self-contained — the HTML must therefore
 * be self-contained too (use your tool's single-file mode); relative
 * sub-asset references won't resolve.
 * @example story.html({ path: './coverage/index.html', title: 'Coverage' })
 * @example story.html({ url: 'https://dash.example.com/run/42', height: 600 })
 * @example story.html({ content: chartHtml, title: 'Latency chart' })
 */
function html(options: HtmlOptions, children?: DocEntry[]): DocEntry {
  return attachDoc(buildHtmlDocEntry(options), children);
}

/**
 * Add tag(s) to the current step or story-level.
 * @example story.tag('admin') or story.tag(['admin', 'security'])
 */
function tag(name: string | string[], children?: DocEntry[]): DocEntry {
  const names = Array.isArray(name) ? name : [name];
  return attachDoc({ kind: 'tag', names, phase: 'runtime' }, children);
}

/**
 * Add a custom documentation entry for use with custom renderers.
 * @example story.custom({ type: 'myType', data: { foo: 'bar' } })
 */
function custom(options: CustomOptions, children?: DocEntry[]): DocEntry {
  return attachDoc({
    kind: 'custom',
    type: options.type,
    data: options.data,
    phase: 'runtime',
  }, children);
}

// ============================================================================
// Attachments
// ============================================================================

/**
 * Attach a file or inline content to the current step or test case.
 * @example story.attach({ name: 'screenshot', mediaType: 'image/png', path: '/tmp/screenshot.png' })
 */
function attach(options: AttachmentOptions): void {
  const ctx = getContext();
  const stepIndex = ctx.currentStep
    ? ctx.meta.steps.indexOf(ctx.currentStep)
    : undefined;
  ctx.attachments.push({
    ...options,
    stepIndex: stepIndex !== undefined && stepIndex >= 0 ? stepIndex : undefined,
    stepId: ctx.currentStep?.id,
  });
  // Store attachments on task.meta so reporter can read them
  if (ctx.taskMeta) {
    ctx.taskMeta.storyAttachments = ctx.attachments;
  }
}

// ============================================================================
// Step Timing
// ============================================================================

/**
 * Start a timer for the current step. Returns a token to pass to endTimer().
 */
function startTimer(): number {
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
}

/**
 * End a timer and record duration on the step that was active when startTimer() was called.
 */
function endTimer(token: number): void {
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
    syncMetaToTask();
  }
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
  syncMetaToTask();

  const start = performance.now();

  try {
    const result = body();

    // Handle async functions
    if (result instanceof Promise) {
      return result.then(
        (val) => {
          step.durationMs = performance.now() - start;
          syncMetaToTask();
          return val;
        },
        (err) => {
          step.durationMs = performance.now() - start;
          syncMetaToTask();
          throw err;
        },
      ) as T;
    }

    step.durationMs = performance.now() - start;
    syncMetaToTask();
    return result;
  } catch (err) {
    step.durationMs = performance.now() - start;
    syncMetaToTask();
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
 * await story.expect('async check', async () => { ... });
 * ```
 */
function storyExpect<T>(text: string, body: () => T): T {
  return fn('Then', text, body);
}

// ============================================================================
// Span attachment: story.attachSpans()
// ============================================================================

/**
 * Attach OTel spans to the current test so the StoryReporter renders them
 * as a trace waterfall in HTML reports.
 *
 * Accepts any array of objects with at least `spanId` and `name` fields.
 * Structurally compatible with autotel's `SerializedSpan` and the
 * `OtelSpan` type from executable-stories-formatters.
 *
 * Pass `traceId` (and optionally `spanId`) when the trace was captured *after*
 * `story.init()` ran — e.g. the test wraps the work in its own root span. The
 * init-time OTel bridge can't see a trace that doesn't exist yet, so this is
 * where the "View Trace" link and trace badge get wired (using the
 * `traceUrlTemplate` from init).
 *
 * @example
 * ```ts
 * import { serializeSpan } from 'autotel/test-span-collector';
 *
 * // After running code that creates spans:
 * const spans = exporter.getFinishedSpans().map(serializeSpan);
 * story.attachSpans(spans, { traceId, spanId });
 * ```
 */
function attachSpans(
  spans: ReadonlyArray<Record<string, unknown>>,
  options?: { traceId?: string; spanId?: string },
): void {
  const ctx = getContext();
  if (ctx.taskMeta) {
    ctx.taskMeta.otelSpans = spans;
  }
  if (options?.traceId) {
    applyTraceToMeta(
      ctx.meta,
      options.traceId,
      options.spanId,
      ctx.traceUrlTemplate,
    );
    syncMetaToTask();
  }
}

// ============================================================================
// Export story object
// ============================================================================

/**
 * The main story API object.
 *
 * Use with native Vitest describe/it/test for full IDE support:
 *
 * @example
 * ```ts
 * import { describe, it, expect } from 'vitest';
 * import { story } from 'executable-stories-vitest';
 *
 * describe('Calculator', () => {
 *   it('adds two numbers', ({ task }) => {
 *     story.init(task);
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
  // Core
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
  note,
  kv,
  json,
  state,
  code,
  table,
  link,
  section,
  mermaid,
  screenshot,
  video,
  html,
  tag,
  custom,

  // Attachments
  attach,

  // OTel span attachment
  attachSpans,

  // Step wrappers
  fn,
  expect: storyExpect,

  // Step timing
  startTimer,
  endTimer,
};

export type Story = typeof story;
