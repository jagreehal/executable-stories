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

import type { TestInfo } from '@playwright/test';
import type {
  StepKeyword,
  StoryMeta,
  StoryStep,
  DocEntry,
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
    syncAnnotationToTest();
  };
}

// ============================================================================
// story.init() - Playwright-specific
// ============================================================================

function init(testInfo: TestInfo, options?: StoryOptions): void {
  const meta: StoryMeta = {
    scenario: testInfo.title,
    steps: [],
    suitePath: extractSuitePath(testInfo),
    tags: options?.tags,
    tickets: normalizeTickets(options?.ticket),
    meta: options?.meta,
    sourceOrder: sourceOrderCounter++,
  };

  testInfo.annotations.push({
    type: 'story-meta',
    description: JSON.stringify(meta),
  });

  activeContext = {
    meta,
    currentStep: null,
    stepCounter: 0,
    attachments: [],
    activeTimers: new Map(),
    timerCounter: 0,
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
  syncAnnotationToTest();

  const start = performance.now();
  try {
    const result = body();
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
  note(text: string): void {
    attachDoc({ kind: 'note', text, phase: 'runtime' });
    syncAnnotationToTest();
  },

  tag(name: string | string[]): void {
    const names = Array.isArray(name) ? name : [name];
    attachDoc({ kind: 'tag', names, phase: 'runtime' });
    syncAnnotationToTest();
  },

  kv(options: KvOptions): void {
    attachDoc({ kind: 'kv', label: options.label, value: options.value, phase: 'runtime' });
    syncAnnotationToTest();
  },

  json(options: JsonOptions): void {
    const content = JSON.stringify(options.value, null, 2);
    attachDoc({ kind: 'code', label: options.label, content, lang: 'json', phase: 'runtime' });
    syncAnnotationToTest();
  },

  code(options: CodeOptions): void {
    attachDoc({ kind: 'code', label: options.label, content: options.content, lang: options.lang, phase: 'runtime' });
    syncAnnotationToTest();
  },

  table(options: TableOptions): void {
    attachDoc({ kind: 'table', label: options.label, columns: options.columns, rows: options.rows, phase: 'runtime' });
    syncAnnotationToTest();
  },

  link(options: LinkOptions): void {
    attachDoc({ kind: 'link', label: options.label, url: options.url, phase: 'runtime' });
    syncAnnotationToTest();
  },

  section(options: SectionOptions): void {
    attachDoc({ kind: 'section', title: options.title, markdown: options.markdown, phase: 'runtime' });
    syncAnnotationToTest();
  },

  mermaid(options: MermaidOptions): void {
    attachDoc({ kind: 'mermaid', code: options.code, title: options.title, phase: 'runtime' });
    syncAnnotationToTest();
  },

  screenshot(options: ScreenshotOptions): void {
    attachDoc({ kind: 'screenshot', path: options.path, alt: options.alt, phase: 'runtime' });
    syncAnnotationToTest();
  },

  custom(options: CustomOptions): void {
    attachDoc({ kind: 'custom', type: options.type, data: options.data, phase: 'runtime' });
    syncAnnotationToTest();
  },

  // Attachments
  attach: playwrightAttach,

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
