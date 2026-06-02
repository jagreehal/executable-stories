/**
 * Cypress story.* API for executable-stories.
 *
 * Uses native Cypress describe/it with opt-in documentation.
 * Story meta is flushed to Node via cy.task from the support file.
 *
 * @example
 * ```ts
 * import { story } from 'executable-stories-cypress';
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

import type {
  StepKeyword,
  StepMode,
  StoryMeta,
  StoryStep,
  DocEntry,
  StoryDocs,
  StoryOptions,
  AttachmentOptions,
  ScopedAttachment,
  RecordMetaPayload,
  NormalizedTicket,
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
  NormalizedTicket,
  TicketInput,
} from './types';

export type { RecordMetaPayload } from './types';

// ============================================================================
// Internal types
// ============================================================================

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
  specRelative: string;
  titlePath: string[];
  otelSpans?: ReadonlyArray<Record<string, unknown>>;
  traceUrlTemplate?: string;
  traceDocAdded: boolean;
}

type ScenarioBody = () => unknown;
type ItLike = ((title: string, body: ScenarioBody) => unknown) & {
  skip?: (title: string, body: ScenarioBody) => unknown;
  only?: (title: string, body: ScenarioBody) => unknown;
};

// ============================================================================
// Cypress-specific context
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
  if (docs.video) {
    entries.push({
      kind: 'video',
      path: docs.video.path,
      caption: docs.video.caption,
      poster: docs.video.poster,
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

/**
 * Extract suite path from Cypress.currentTest.titlePath (describe blocks only).
 * titlePath is [describe1, describe2, ..., testTitle] — we want everything except the last.
 */
function extractSuitePath(titlePath: string[]): string[] | undefined {
  if (titlePath.length <= 1) return undefined;
  const suitePath = titlePath.slice(0, -1);
  return suitePath.length > 0 ? suitePath : undefined;
}

function extractTraceIdFromSpans(
  spans: ReadonlyArray<Record<string, unknown>>,
): string | undefined {
  for (const span of spans) {
    const direct = span.traceId;
    if (typeof direct === 'string' && direct.length > 0) return direct;

    const context = span.context;
    if (context && typeof context === 'object' && context !== null) {
      const nested = (context as { traceId?: unknown }).traceId;
      if (typeof nested === 'string' && nested.length > 0) return nested;
    }
  }
  return undefined;
}

// ============================================================================
// Step markers
// ============================================================================

export type StepMarker = {
  (text: string, docs?: StoryDocs): void;
  (text: string, children: DocEntry[]): void;
  <T>(text: string, body: () => T): T;
  skip: StepMarker;
  only: StepMarker;
  todo: StepMarker;
  fails: StepMarker;
  concurrent: StepMarker;
};

function createStepMarker(keyword: StepKeyword, mode?: StepMode): StepMarker {
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
      ...(mode ? { mode } : {}),
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
  const marker = stepMarker as StepMarker;
  marker.skip = mode ? marker : createStepMarker(keyword, 'skip');
  marker.only = mode ? marker : createStepMarker(keyword, 'only');
  marker.todo = mode ? marker : createStepMarker(keyword, 'todo');
  marker.fails = mode ? marker : createStepMarker(keyword, 'fails');
  marker.concurrent = mode ? marker : createStepMarker(keyword, 'concurrent');
  return marker;
}

// ============================================================================
// story.init() - Cypress-specific
// ============================================================================

function init(options?: StoryOptions, scenarioOverride?: string): void {
  const currentTest = Cypress.currentTest;
  const spec = Cypress.spec;
  if (!currentTest) {
    throw new Error("story.init() must be called inside an it() block so Cypress.currentTest is available.");
  }

  const titlePath = currentTest.titlePath ?? [currentTest.title];
  const scenario = scenarioOverride ?? currentTest.title;
  const suitePath = extractSuitePath(titlePath);
  const specRelative = spec?.relative ?? "unknown";

  const meta: StoryMeta = {
    scenario,
    steps: [],
    suitePath,
    tags: options?.tags,
    tickets: normalizeTickets(options?.ticket),
    covers: options?.covers,
    meta: options?.meta,
    sourceOrder: sourceOrderCounter++,
  };

  activeContext = {
    meta,
    currentStep: null,
    stepCounter: 0,
    attachments: [],
    activeTimers: new Map(),
    timerCounter: 0,
    specRelative,
    titlePath,
    traceUrlTemplate: options?.traceUrlTemplate,
    traceDocAdded: false,
  };
}

function runScenario(mode: 'normal' | 'skip' | 'only', title: string, body: ScenarioBody, options?: StoryOptions): unknown {
  const globalIt = (globalThis as { it?: ItLike }).it;
  if (!globalIt) {
    throw new Error('Global it() is not available. Use story.skip/story.only inside Cypress spec files.');
  }

  const runner =
    mode === 'skip'
      ? globalIt.skip
      : mode === 'only'
        ? globalIt.only
        : globalIt;

  if (!runner) {
    throw new Error(`Global it.${mode}() is not available in this environment.`);
  }

  return runner(title, () => {
    init(options);
    return body();
  });
}

/**
 * Get the current story meta and clear the active context.
 * Called by the support file after each test to send meta to Node via cy.task.
 * Returns null if story.init() was never called for this test.
 */
export function getAndClearMeta(): RecordMetaPayload | null {
  if (!activeContext) return null;
  const payload: RecordMetaPayload = {
    specRelative: activeContext.specRelative,
    titlePath: activeContext.titlePath,
    meta: activeContext.meta,
    attachments: activeContext.attachments.length > 0 ? activeContext.attachments : undefined,
    otelSpans: activeContext.otelSpans,
  };
  activeContext = null;
  return payload;
}

// ============================================================================
// story.fn() and story.expect()
// ============================================================================

/**
 * Wrap a function as a step with timing and error capture.
 * Records the step with `wrapped: true` and `durationMs`.
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
 * Wrap an assertion as a Then step with timing and error capture.
 * Shorthand for `story.fn('Then', text, body)`.
 */
function storyExpect<T>(text: string, body: () => T): T {
  return fn('Then', text, body);
}

// ============================================================================
// Export story object
// ============================================================================

export const story = {
  init,
  skip(title: string, body: ScenarioBody, options?: StoryOptions): unknown {
    return runScenario('skip', title, body, options);
  },
  only(title: string, body: ScenarioBody, options?: StoryOptions): unknown {
    return runScenario('only', title, body, options);
  },

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
    return attachDoc({ kind: 'screenshot', path: options.path, alt: options.alt, phase: 'runtime' }, children);
  },

  video(options: VideoOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: 'video', path: options.path, caption: options.caption, poster: options.poster, phase: 'runtime' }, children);
  },

  custom(options: CustomOptions, children?: DocEntry[]): DocEntry {
    return attachDoc({ kind: 'custom', type: options.type, data: options.data, phase: 'runtime' }, children);
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
    ctx.otelSpans = spans;

    if (ctx.traceDocAdded) return;
    const traceId = extractTraceIdFromSpans(spans);
    if (!traceId) return;

    ctx.meta.meta = {
      ...ctx.meta.meta,
      otel: { traceId },
    };
    ctx.meta.docs ??= [];
    ctx.meta.docs.push({ kind: 'kv', label: 'Trace ID', value: traceId, phase: 'runtime' });

    const template = ctx.traceUrlTemplate;
    if (template) {
      const url = template.replace('{traceId}', traceId);
      ctx.meta.docs.push({ kind: 'link', label: 'View Trace', url, phase: 'runtime' });
    }
    ctx.traceDocAdded = true;
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

  // Step wrappers
  fn,
  expect: storyExpect,
};

const stepCallbacks = {
  given: story.given,
  when: story.when,
  then: story.then,
  and: story.and,
  but: story.but,
  arrange: story.arrange,
  act: story.act,
  assert: story.assert,
  setup: story.setup,
  context: story.context,
  execute: story.execute,
  action: story.action,
  verify: story.verify,
};

function docStory(title: string): void;
function docStory(title: string, callback: (steps: typeof stepCallbacks) => void): void;
function docStory(title: string, callback?: (steps: typeof stepCallbacks) => void): void {
  init(undefined, title);
  if (callback) callback(stepCallbacks);
}

export const doc = {
  story: docStory,
};

export type Story = typeof story;
