/** Starts the story's step checklist in a failure message. */
export const STEP_TRAIL_MARKER = '\n\nStory steps:\n';

/** Annotation the worker keeps current with which steps failed. */
export const TRAIL_ANNOTATION = 'story-trail';

/** What the worker knows about failures when the test ends. */
export interface TrailState {
  /** Ids of steps a soft assertion failed in, plus the wrapped step that threw. */
  failed: string[];
  /** How many of the test's errors the worker had charged to a step. */
  errorsSeen: number;
}

interface TrailStep {
  id?: string;
  keyword: string;
  text: string;
  wrapped?: boolean;
}

/**
 * The story's steps as a checklist for a failure, so a red test shows how far
 * the story got without opening the report. Errors raised after the worker's
 * last check belong to the last step when it is a marker: the code after a
 * marker checks its claim. With no step charged, the failure came after the
 * last step.
 */
export function formatStepTrail(steps: TrailStep[], state: TrailState, errorCount: number): string {
  if (steps.length === 0) return '';
  const failed = new Set(state.failed);
  const last = steps[steps.length - 1];
  if (errorCount > state.errorsSeen && !last.wrapped && last.id) failed.add(last.id);
  const lines = steps.map((s) => `  ${s.id && failed.has(s.id) ? '✗' : '✓'} ${s.keyword} ${s.text}`);
  if (failed.size === 0) lines.push('  ✗ (failed after the last step)');
  return STEP_TRAIL_MARKER + lines.join('\n');
}

/**
 * Add `trail` to each error, once. Playwright prints an error from its stack,
 * so the trail goes into the stack too, right after the message it starts with.
 */
export function appendStepTrail(errors: Array<{ message?: string; stack?: string }>, trail: string): void {
  if (!trail) return;
  for (const err of errors) {
    const message = err.message ?? '';
    if (message.includes(STEP_TRAIL_MARKER)) continue;
    if (err.stack?.startsWith(message)) err.stack = message + trail + err.stack.slice(message.length);
    err.message = message + trail;
  }
}

/** An error with the step checklist taken back out of its message and stack. */
export function stripStepTrail<E extends { message?: string; stack?: string }>(err: E): E {
  const at = err.message?.indexOf(STEP_TRAIL_MARKER) ?? -1;
  if (at < 0) return err;
  const trail = err.message!.slice(at);
  return { ...err, message: err.message!.slice(0, at), stack: err.stack?.replace(trail, '') };
}
