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
  StoryMeta,
  StoryStep,
  DocEntry,
  StoryDocs,
  StoryOptions,
  AttachmentOptions,
  ScopedAttachment,
  RecordMetaPayload,
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
}

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

function normalizeTickets(ticket: string | string[] | undefined): string[] | undefined {
  if (!ticket) return undefined;
  return Array.isArray(ticket) ? ticket : [ticket];
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

/**
 * Extract suite path from Cypress.currentTest.titlePath (describe blocks only).
 * titlePath is [describe1, describe2, ..., testTitle] — we want everything except the last.
 */
function extractSuitePath(titlePath: string[]): string[] | undefined {
  if (titlePath.length <= 1) return undefined;
  const suitePath = titlePath.slice(0, -1);
  return suitePath.length > 0 ? suitePath : undefined;
}

// ============================================================================
// Step markers
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
// story.init() - Cypress-specific
// ============================================================================

function init(options?: StoryOptions): void {
  const currentTest = Cypress.currentTest;
  const spec = Cypress.spec;
  if (!currentTest) {
    throw new Error("story.init() must be called inside an it() block so Cypress.currentTest is available.");
  }

  const titlePath = currentTest.titlePath ?? [currentTest.title];
  const scenario = currentTest.title;
  const suitePath = extractSuitePath(titlePath);
  const specRelative = spec?.relative ?? "unknown";

  const meta: StoryMeta = {
    scenario,
    steps: [],
    suitePath,
    tags: options?.tags,
    tickets: normalizeTickets(options?.ticket),
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
  };
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
  note(text: string): void {
    attachDoc({ kind: 'note', text, phase: 'runtime' });
  },

  tag(name: string | string[]): void {
    const names = Array.isArray(name) ? name : [name];
    attachDoc({ kind: 'tag', names, phase: 'runtime' });
  },

  kv(options: KvOptions): void {
    attachDoc({ kind: 'kv', label: options.label, value: options.value, phase: 'runtime' });
  },

  json(options: JsonOptions): void {
    const content = JSON.stringify(options.value, null, 2);
    attachDoc({ kind: 'code', label: options.label, content, lang: 'json', phase: 'runtime' });
  },

  code(options: CodeOptions): void {
    attachDoc({ kind: 'code', label: options.label, content: options.content, lang: options.lang, phase: 'runtime' });
  },

  table(options: TableOptions): void {
    attachDoc({ kind: 'table', label: options.label, columns: options.columns, rows: options.rows, phase: 'runtime' });
  },

  link(options: LinkOptions): void {
    attachDoc({ kind: 'link', label: options.label, url: options.url, phase: 'runtime' });
  },

  section(options: SectionOptions): void {
    attachDoc({ kind: 'section', title: options.title, markdown: options.markdown, phase: 'runtime' });
  },

  mermaid(options: MermaidOptions): void {
    attachDoc({ kind: 'mermaid', code: options.code, title: options.title, phase: 'runtime' });
  },

  screenshot(options: ScreenshotOptions): void {
    attachDoc({ kind: 'screenshot', path: options.path, alt: options.alt, phase: 'runtime' });
  },

  custom(options: CustomOptions): void {
    attachDoc({ kind: 'custom', type: options.type, data: options.data, phase: 'runtime' });
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

export type Story = typeof story;
