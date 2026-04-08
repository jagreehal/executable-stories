/**
 * Stories demonstrating the five Playwright v1.49–v1.59 integrations
 * added to executable-stories-playwright:
 *
 *  1. page.screencast.showChapter() – auto chapter markers in recordings (v1.59)
 *  2. context.tracing.group()       – BDD phase grouping in trace viewer (v1.49)
 *  3. test.step() / TestStepInfo    – native step visibility + step.attach() (v1.51)
 *  4. story.init({ tags })          – Playwright annotations for UI Mode tag filters (v1.43)
 *  5. story.console()               – page.consoleMessages() as a doc entry (v1.56)
 *
 * Each test exercises the real story API so the features appear in generated docs.
 */

import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';
import type { TestStepInfo } from 'executable-stories-playwright';

// ── Helpers ───────────────────────────────────────────────────────────────────

interface DocEntryShape { kind: string; label?: string; content?: string; names?: string[] }
interface StepShape { keyword: string; text: string; durationMs?: number; docs?: DocEntryShape[] }
interface MetaShape { tags?: string[]; steps: StepShape[]; docs?: DocEntryShape[] }

function getStoryMeta(testInfo: { annotations: Array<{ type: string; description?: string }> }): MetaShape | undefined {
  const a = testInfo.annotations.find((x) => x.type === 'story-meta');
  if (!a?.description) return undefined;
  return JSON.parse(a.description) as MetaShape;
}

/** Search story-level docs AND all step docs for a matching entry. */
function findDoc(meta: MetaShape | undefined, pred: (d: DocEntryShape) => boolean): DocEntryShape | undefined {
  if (!meta) return undefined;
  const storyLevel = meta.docs?.find(pred);
  if (storyLevel) return storyLevel;
  for (const step of meta.steps) {
    const stepLevel = step.docs?.find(pred);
    if (stepLevel) return stepLevel;
  }
  return undefined;
}

// ── Feature: Tag sync ─────────────────────────────────────────────────────────

test.describe('Tag sync (Playwright v1.43)', () => {
  test('story.tag() options appear as native Playwright annotations', async ({}, testInfo) => {
    story.init(testInfo, { tags: ['@smoke', '@regression'] });

    story.given('story tags are declared at init time');

    story.then('they appear in Playwright testInfo.annotations', () => {
      const tagAnnotations = testInfo.annotations.filter((a) => a.type === 'tag');
      const tagValues = tagAnnotations.map((a) => a.description);
      expect(tagValues).toContain('@smoke');
      expect(tagValues).toContain('@regression');
    });

    story.and('the story meta retains the tags for report generation', () => {
      const meta = getStoryMeta(testInfo);
      expect(meta?.tags).toEqual(['@smoke', '@regression']);
    });

    story.note('Tags synced via testInfo.annotations({ type: "tag" }) so they appear in UI Mode filters.');
  });

  test('story with no tags produces no extra tag annotations', async ({}, testInfo) => {
    story.init(testInfo);
    story.given('no tags are declared');
    story.then('no tag annotations are added', () => {
      const tagAnnotations = testInfo.annotations.filter((a) => a.type === 'tag');
      expect(tagAnnotations).toHaveLength(0);
    });
  });
});

// ── Feature: Console capture ──────────────────────────────────────────────────

test.describe('Console capture (Playwright v1.56)', () => {
  test('story.console() captures page console messages as a doc entry', async ({}, testInfo) => {
    story.init(testInfo);

    // Build a mock page that implements the v1.56 consoleMessages() API
    const mockMessages = [
      { type: () => 'log', text: () => 'App initialised' },
      { type: () => 'warn', text: () => 'Deprecated API used' },
    ];
    const mockPage = {
      consoleMessages: () => mockMessages,
      pageErrors: () => [] as Error[],
    };

    story.given('a page with two console messages');

    story.when('story.console() is called', () => {
      story.console({ page: mockPage, label: 'App output' });
    });

    story.then('a code doc entry is created with the console content', () => {
      const meta = getStoryMeta(testInfo);
      const consoleEntry = findDoc(meta, (d) => d.kind === 'code' && d.label === 'App output');
      expect(consoleEntry).toBeDefined();
      expect(consoleEntry?.content).toContain('[log] App initialised');
      expect(consoleEntry?.content).toContain('[warn] Deprecated API used');
    });
  });

  test('story.console() gracefully handles missing consoleMessages API', async ({}, testInfo) => {
    story.init(testInfo);

    const legacyPage = {}; // no consoleMessages() – pre-v1.56 page

    story.given('a page without the consoleMessages() API');

    story.when('story.console() is called', () => {
      story.console({ page: legacyPage, label: 'Legacy output' });
    });

    story.then('an empty doc entry is produced without throwing', () => {
      const meta = getStoryMeta(testInfo);
      const entry = findDoc(meta, (d) => d.kind === 'code' && d.label === 'Legacy output');
      expect(entry).toBeDefined();
      expect(entry?.content).toBe('(no console output)');
    });
  });

  test('story.console() does NOT include page errors by default', async ({}, testInfo) => {
    story.init(testInfo);

    const mockPage = {
      consoleMessages: () => [{ type: () => 'log', text: () => 'hello' }],
      pageErrors: () => [new Error('should not appear')],
    };

    story.given('a page with console output and a page error');
    story.when('story.console() is called without includeErrors', () => {
      story.console({ page: mockPage, label: 'Default output' });
    });
    story.then('page errors are not included in the output', () => {
      const meta = getStoryMeta(testInfo);
      const entry = findDoc(meta, (d) => d.kind === 'code' && d.label === 'Default output');
      expect(entry?.content).toContain('[log] hello');
      expect(entry?.content).not.toContain('should not appear');
    });
  });

  test('story.console() includes page errors when includeErrors is true', async ({}, testInfo) => {
    story.init(testInfo);

    const mockPage = {
      consoleMessages: () => [{ type: () => 'log', text: () => 'hello' }],
      pageErrors: () => [new Error('Uncaught TypeError: cannot read property')],
    };

    story.given('a page with a console message and an uncaught error');

    story.when('story.console() is called with includeErrors: true', () => {
      story.console({ page: mockPage, label: 'Full output', includeErrors: true });
    });

    story.then('both the console message and the error appear in the doc entry', () => {
      const meta = getStoryMeta(testInfo);
      const entry = findDoc(meta, (d) => d.kind === 'code' && d.label === 'Full output');
      expect(entry?.content).toContain('[log] hello');
      expect(entry?.content).toContain('[error] Uncaught TypeError');
    });
  });
});

// ── Feature: Async callback integrations ──────────────────────────────────────

test.describe('Async step callback integrations (v1.49–v1.59)', () => {
  test('async step callbacks receive TestStepInfo as second argument', async ({}, testInfo) => {
    // Fixtures must be set for runStep() to activate (which provides TestStepInfo)
    const mockFixtures = { page: {} };
    story.init(mockFixtures, testInfo);

    let capturedStep: TestStepInfo | undefined;

    story.given('an async step callback that captures its TestStepInfo');

    await story.when('the async step runs', async (_fixtures, step) => {
      capturedStep = step;
    });

    story.then('TestStepInfo was injected', () => {
      expect(capturedStep).toBeDefined();
      // TestStepInfo (v1.51) exposes attach() and skip() methods
      expect(typeof capturedStep?.attach).toBe('function');
      expect(typeof capturedStep?.skip).toBe('function');
    });

    story.note('TestStepInfo is injected via test.step() – same object Playwright provides in test.step(label, async (step) => …). Use step.attach() to attach files to the step, or step.skip() to conditionally skip it.');
  });

  test('async step callbacks work without fixtures (no runStep path)', async ({}, testInfo) => {
    story.init(testInfo); // no fixtures passed

    story.given('no fixtures are provided to story.init');

    // Without fixtures, isAsyncFunction=true but ctx.fixtures is undefined → sync path
    const result = await story.when('an async step still executes correctly', async () => {
      return 42;
    });

    story.then('the result is returned correctly', () => {
      expect(result).toBe(42);
    });
  });

  test('screencast showChapter is called for each async step when available', async ({}, testInfo) => {
    const chapterLabels: string[] = [];

    const mockFixtures = {
      page: {
        screencast: {
          showChapter: async (label: string) => {
            chapterLabels.push(label);
          },
        },
        context: () => ({}),
      },
    };

    story.init(mockFixtures, testInfo);

    story.given('a page with screencast support');

    await story.when('the first async step runs', async () => {});
    await story.then('the second async step runs', async () => {});

    story.and('chapter markers were shown for each step', () => {
      expect(chapterLabels).toHaveLength(2);
      expect(chapterLabels[0]).toContain('When:');
      expect(chapterLabels[1]).toContain('Then:');
    });

    story.section({
      title: 'Screencast integration',
      markdown: [
        'Each `async` step callback automatically calls `page.screencast.showChapter(label)`',
        'so the video recording is narrated with the BDD step title.',
        '',
        '**Chapter label format:** `<Keyword>: <step text>`',
        '',
        'e.g. `When: the user submits the form`',
      ].join('\n'),
    });
  });

  test('graceful degradation: sync callbacks skip runStep entirely', async ({}, testInfo) => {
    const chapterLabels: string[] = [];

    const mockFixtures = {
      page: {
        screencast: {
          showChapter: async (label: string) => {
            chapterLabels.push(label);
          },
        },
      },
    };

    story.init(mockFixtures, testInfo);

    story.given('a page with screencast support');

    // Sync callback → isAsyncFunction() returns false → runStep NOT called
    const result = story.when('a sync step runs', () => 'sync-result');

    story.then('the sync result is returned correctly', () => {
      expect(result).toBe('sync-result');
    });

    story.and('no chapter was shown for the sync step', () => {
      // screencast.showChapter is only called for async callbacks
      expect(chapterLabels).toHaveLength(0);
    });
  });

  test('tracing.group is called for async steps when context is available', async ({}, testInfo) => {
    const groupLabels: string[] = [];

    const fakeContext = {
      tracing: {
        group: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
          groupLabels.push(label);
          return fn();
        },
      },
    };

    const mockFixtures = {
      page: { context: () => fakeContext },
    };

    story.init(mockFixtures, testInfo);

    story.given('a context with tracing active');

    await story.when('the async step runs', async () => {});

    story.then('tracing.group was called with the step label', () => {
      expect(groupLabels).toHaveLength(1);
      expect(groupLabels[0]).toContain('When:');
    });

    story.note('tracing.group() groups child actions under the BDD step label in the Playwright trace viewer.');
  });
});
