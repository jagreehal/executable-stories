/**
 * Tests for the step-runner module.
 *
 * Verifies:
 *   - isAsyncFunction correctly distinguishes async vs sync functions
 *   - runStep calls page.screencast.showChapter() before the body
 *   - runStep passes TestStepInfo as second argument to the body
 *   - runStep degrades gracefully when screencast / tracing APIs are absent
 *   - runStep propagates errors from the body
 *
 * Note: runStep wraps execution in test.step(), so these tests must run
 * inside Playwright's test runner (they are .test.ts files using @playwright/test).
 */

import { test, expect } from '@playwright/test';
import { isAsyncFunction, runStep } from '../step-runner';

// ── isAsyncFunction ────────────────────────────────────────────────────────────

test.describe('isAsyncFunction', () => {
  test('returns true for async arrow functions', () => {
    expect(isAsyncFunction(async () => {})).toBe(true);
  });

  test('returns true for async functions with params', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    expect(isAsyncFunction(async ({ page }: { page: unknown }) => {})).toBe(true);
  });

  test('returns false for sync arrow functions', () => {
    expect(isAsyncFunction(() => 5)).toBe(false);
  });

  test('returns false for sync functions returning a Promise', () => {
    expect(isAsyncFunction(() => Promise.resolve(5))).toBe(false);
  });

  test('returns false for non-functions', () => {
    expect(isAsyncFunction(null)).toBe(false);
    expect(isAsyncFunction(42)).toBe(false);
    expect(isAsyncFunction('string')).toBe(false);
    expect(isAsyncFunction({})).toBe(false);
  });
});

// ── runStep ────────────────────────────────────────────────────────────────────

test.describe('runStep', () => {
  test('executes the body and returns its value', async () => {
    const result = await runStep('Given: the value is 42', async () => 42, {});
    expect(result).toBe(42);
  });

  test('passes fixtures as first argument to body', async () => {
    const fixtures = { page: {}, context: {} };
    let received: Record<string, unknown> | undefined;

    await runStep(
      'When: fixtures are passed',
      async (f) => { received = f; },
      fixtures,
    );

    expect(received).toBe(fixtures);
  });

  test('passes TestStepInfo as second argument to body', async () => {
    let receivedStep: unknown;

    await runStep(
      'Then: stepInfo is received',
      async (_fixtures, step) => { receivedStep = step; },
      {},
    );

    // TestStepInfo (v1.51) has attach() and skip() methods
    expect(receivedStep).toBeDefined();
    expect(typeof (receivedStep as { attach?: unknown })?.attach).toBe('function');
    expect(typeof (receivedStep as { skip?: unknown })?.skip).toBe('function');
  });

  test('calls page.screencast.showChapter() before the body runs', async () => {
    const callOrder: string[] = [];

    const mockPage = {
      screencast: {
        showChapter: async (label: string) => {
          callOrder.push(`chapter:${label}`);
        },
      },
    };

    await runStep(
      'When: the step runs',
      async () => { callOrder.push('body'); },
      { page: mockPage },
    );

    expect(callOrder).toEqual(['chapter:When: the step runs', 'body']);
  });

  test('degrades gracefully when page.screencast is absent', async () => {
    // page without screencast (Playwright < v1.59)
    const mockPage = {};

    await expect(
      runStep('Given: no screencast', async () => 'ok', { page: mockPage }),
    ).resolves.toBe('ok');
  });

  test('degrades gracefully when screencast.showChapter throws', async () => {
    const mockPage = {
      screencast: {
        showChapter: async () => { throw new Error('screencast not started'); },
      },
    };

    // Should NOT propagate the screencast error
    await expect(
      runStep('Given: showChapter throws', async () => 'ok', { page: mockPage }),
    ).resolves.toBe('ok');
  });

  test('degrades gracefully when context.tracing is absent', async () => {
    const mockContext = {}; // no tracing property

    await expect(
      runStep('When: no tracing', async () => 'ok', { context: mockContext }),
    ).resolves.toBe('ok');
  });

  test('degrades gracefully when context.tracing.group throws', async () => {
    const mockContext = {
      tracing: {
        group: async () => { throw new Error('tracing not recording'); },
      },
    };

    // Should fall back to calling body directly without tracing.group
    await expect(
      runStep('When: tracing.group throws', async () => 'ok', { context: mockContext }),
    ).resolves.toBe('ok');
  });

  test('does not retry the body when the body itself throws inside tracing.group', async () => {
    let calls = 0;
    const mockContext = {
      tracing: {
        group: async <T>(_label: string, fn: () => Promise<T>): Promise<T> => {
          return fn();
        },
      },
    };

    await expect(
      runStep(
        'Then: body throws inside tracing.group',
        async () => {
          calls += 1;
          throw new Error('body failed');
        },
        { context: mockContext },
      ),
    ).rejects.toThrow('body failed');

    expect(calls).toBe(1);
  });

  test('propagates errors thrown by the body', async () => {
    await expect(
      runStep('Then: body throws', async () => { throw new Error('step failed'); }, {}),
    ).rejects.toThrow('step failed');
  });

  test('derives context from page.context() when context fixture absent', async () => {
    const tracingCalls: string[] = [];
    const fakeContext = {
      tracing: {
        group: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
          tracingCalls.push(label);
          return fn();
        },
      },
    };
    const mockPage = {
      context: () => fakeContext,
    };

    await runStep('When: context from page.context()', async () => {}, { page: mockPage });

    expect(tracingCalls).toContain('When: context from page.context()');
  });

  test('uses context.tracing.group() when tracing is recording', async () => {
    const tracingCalls: string[] = [];

    const mockContext = {
      tracing: {
        group: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
          tracingCalls.push(label);
          return fn();
        },
      },
    };

    await runStep(
      'Given: tracing is active',
      async () => {},
      { context: mockContext },
    );

    expect(tracingCalls).toEqual(['Given: tracing is active']);
  });

  test('all three integrations work together', async () => {
    const callOrder: string[] = [];

    const mockPage = {
      screencast: {
        showChapter: async (label: string) => {
          callOrder.push(`screencast:${label}`);
        },
      },
      context: () => mockContext,
    };

    const mockContext = {
      tracing: {
        group: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
          callOrder.push(`tracing:${label}`);
          return fn();
        },
      },
    };

    const result = await runStep(
      'When: everything works together',
      async () => {
        callOrder.push('body');
        return 'done';
      },
      { page: mockPage },
    );

    expect(result).toBe('done');
    expect(callOrder[0]).toBe('screencast:When: everything works together');
    expect(callOrder[1]).toBe('tracing:When: everything works together');
    expect(callOrder[2]).toBe('body');
  });
});
