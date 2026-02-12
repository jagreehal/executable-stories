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

import type {
  DocEntry,
  StepKeyword,
  StoryDocs,
  StoryMeta,
  StoryOptions,
  StoryStep,
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
 * Normalize ticket option to array format.
 */
function normalizeTickets(
  ticket: string | string[] | undefined,
): string[] | undefined {
  if (!ticket) return undefined;
  return Array.isArray(ticket) ? ticket : [ticket];
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
    meta: options?.meta,
    sourceOrder: sourceOrderCounter++,
  };

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
  };
}

// ============================================================================
// Step Markers
// ============================================================================

/**
 * Create a step marker function for a given keyword.
 */
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
    syncMetaToTask();
  };
}

// ============================================================================
// Doc Methods (Standalone)
// ============================================================================

/**
 * Add a free-text note to the current step or story-level if before any step.
 */
function note(text: string): void {
  const ctx = getContext();
  const entry: DocEntry = { kind: 'note', text, phase: 'runtime' };

  if (ctx.currentStep) {
    ctx.currentStep.docs ??= [];
    ctx.currentStep.docs.push(entry);
  } else {
    ctx.meta.docs ??= [];
    ctx.meta.docs.push(entry);
  }
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

/** Options for custom() - custom doc entry */
interface CustomOptions {
  type: string;
  data: unknown;
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
  syncMetaToTask();
}

// ============================================================================
// Doc Methods (Standalone) - same shape as inline docs
// ============================================================================

/**
 * Add a key-value pair to the current step or story-level.
 * @example story.kv({ label: 'Payment ID', value: 'pay_123' })
 */
function kv(options: KvOptions): void {
  attachDoc({
    kind: 'kv',
    label: options.label,
    value: options.value,
    phase: 'runtime',
  });
}

/**
 * Add a JSON code block to the current step or story-level.
 * @example story.json({ label: 'Order', value: { id: 123 } })
 */
function json(options: JsonOptions): void {
  const content = JSON.stringify(options.value, null, 2);
  attachDoc({
    kind: 'code',
    label: options.label,
    content,
    lang: 'json',
    phase: 'runtime',
  });
}

/**
 * Add a code block with optional language to the current step or story-level.
 * @example story.code({ label: 'Config', content: 'port: 3000', lang: 'yaml' })
 */
function code(options: CodeOptions): void {
  attachDoc({
    kind: 'code',
    label: options.label,
    content: options.content,
    lang: options.lang,
    phase: 'runtime',
  });
}

/**
 * Add a markdown table to the current step or story-level.
 * @example story.table({ label: 'Users', columns: ['Name', 'Role'], rows: [['Alice', 'Admin']] })
 */
function table(options: TableOptions): void {
  attachDoc({
    kind: 'table',
    label: options.label,
    columns: options.columns,
    rows: options.rows,
    phase: 'runtime',
  });
}

/**
 * Add a hyperlink to the current step or story-level.
 * @example story.link({ label: 'API Docs', url: 'https://docs.example.com' })
 */
function link(options: LinkOptions): void {
  attachDoc({
    kind: 'link',
    label: options.label,
    url: options.url,
    phase: 'runtime',
  });
}

/**
 * Add a titled section with markdown content to the current step or story-level.
 * @example story.section({ title: 'Details', markdown: 'This is **important**' })
 */
function section(options: SectionOptions): void {
  attachDoc({
    kind: 'section',
    title: options.title,
    markdown: options.markdown,
    phase: 'runtime',
  });
}

/**
 * Add a Mermaid diagram to the current step or story-level.
 * @example story.mermaid({ code: 'graph LR; A-->B', title: 'Flow' })
 */
function mermaid(options: MermaidOptions): void {
  attachDoc({
    kind: 'mermaid',
    code: options.code,
    title: options.title,
    phase: 'runtime',
  });
}

/**
 * Add a screenshot reference to the current step or story-level.
 * @example story.screenshot({ path: '/screenshots/result.png', alt: 'Final result' })
 */
function screenshot(options: ScreenshotOptions): void {
  attachDoc({
    kind: 'screenshot',
    path: options.path,
    alt: options.alt,
    phase: 'runtime',
  });
}

/**
 * Add tag(s) to the current step or story-level.
 * @example story.tag('admin') or story.tag(['admin', 'security'])
 */
function tag(name: string | string[]): void {
  const names = Array.isArray(name) ? name : [name];
  attachDoc({ kind: 'tag', names, phase: 'runtime' });
}

/**
 * Add a custom documentation entry for use with custom renderers.
 * @example story.custom({ type: 'myType', data: { foo: 'bar' } })
 */
function custom(options: CustomOptions): void {
  attachDoc({
    kind: 'custom',
    type: options.type,
    data: options.data,
    phase: 'runtime',
  });
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

  const step: StoryStep = {
    id: `step-${ctx.stepCounter++}`,
    keyword,
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
  code,
  table,
  link,
  section,
  mermaid,
  screenshot,
  tag,
  custom,

  // Attachments
  attach,

  // Step wrappers
  fn,
  expect: storyExpect,

  // Step timing
  startTimer,
  endTimer,
};

export type Story = typeof story;
