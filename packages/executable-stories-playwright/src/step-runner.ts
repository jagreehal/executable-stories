/**
 * Playwright-native step execution helper.
 *
 * Centralises the cross-cutting concerns for fixture-aware step callbacks:
 *   1. page.screencast.showChapter() – narrated chapter markers in video recordings (v1.59)
 *   2. test.step()                    – TestStepInfo access + trace/report visibility (v1.51)
 *   3. context.tracing.group()       – BDD phase grouping in trace viewer (v1.49)
 *
 * Used for callbacks that are either async functions or expect TestStepInfo.
 * Sync callbacks that don't need TestStepInfo follow the faster sync path.
 * All three integrations degrade gracefully if the API is absent.
 */

import { test } from '@playwright/test';
import type { TestStepInfo } from '@playwright/test';

export type { TestStepInfo };

/** Async step callback that optionally receives TestStepInfo as a second argument. */
export type AsyncStepCallback<T = unknown> = (
  fixtures: Record<string, unknown>,
  step?: TestStepInfo,
) => Promise<T>;

/**
 * Execute an async step callback with full Playwright-native integration.
 *
 * Call order:
 *   1. page.screencast.showChapter(label) – sets chapter in the recording before the step runs
 *   2. test.step(label, …)               – wraps execution for trace/report visibility
 *   3. context.tracing.group(label, …)   – groups trace actions under the step label
 *   4. body(fixtures, stepInfo)          – user callback with injected TestStepInfo
 */
export async function runStep<T>(
  label: string,
  body: AsyncStepCallback<T>,
  fixtures: Record<string, unknown>,
): Promise<T> {
  const page = fixtures.page as Record<string, unknown> | undefined;
  // Derive context from fixtures or from page.context() (Playwright sync method)
  const context =
    (fixtures.context as Record<string, unknown> | undefined) ??
    (typeof (page as { context?: () => Record<string, unknown> })?.context === 'function'
      ? (page as { context: () => Record<string, unknown> }).context()
      : undefined);

  // ── Feature 1: Screencast chapter (v1.59) ─────────────────────────────────
  // Show the chapter BEFORE the step body runs so the recording reflects the
  // BDD step title at the right moment. Silently skipped on older Playwright.
  const screencast = page?.screencast as
    | { showChapter?: (label: string) => Promise<void> }
    | undefined;
  if (screencast?.showChapter) {
    try {
      await screencast.showChapter(label);
    } catch {
      // Graceful degradation: screencast not started or API unavailable
    }
  }

  // ── Feature 2: test.step (v1.51) + Feature 3: tracing.group (v1.49) ──────
  // test.step provides TestStepInfo for the callback and makes the step visible
  // in the Playwright trace viewer and HTML report as a named action.
  // tracing.group inside it groups the step's child actions under the label.
  return test.step(label, async (stepInfo) => {
    const tracing = context?.tracing as
      | { group?: <R>(label: string, fn: () => Promise<R>) => Promise<R> }
      | undefined;

    if (tracing?.group) {
      // Track whether body was invoked to avoid double-execution
      // when body throws inside tracing.group
      let bodyInvoked = false;
      try {
        return await tracing.group(label, async () => {
          bodyInvoked = true;
          return body(fixtures, stepInfo);
        });
      } catch (e) {
        // If body was invoked, it threw - re-throw (don't retry)
        if (bodyInvoked) throw e;
        // Otherwise, tracing.group itself threw (e.g., tracing not recording)
        // Fall back to calling body without tracing.group
        return body(fixtures, stepInfo);
      }
    }

    return body(fixtures, stepInfo);
  });
}

/**
 * Returns true if fn is an async function (declared with `async`).
 * Used along with callback arity to decide whether to route a step callback through runStep().
 *
 * Callbacks are routed through runStep() if they are async functions OR if they
 * have arity >= 2 (meaning they expect TestStepInfo as the second argument).
 */
export function isAsyncFunction(fn: unknown): boolean {
  return (
    typeof fn === 'function' &&
    (fn as { constructor?: { name?: string } }).constructor?.name === 'AsyncFunction'
  );
}
