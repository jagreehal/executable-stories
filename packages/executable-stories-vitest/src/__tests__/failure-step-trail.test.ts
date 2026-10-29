/**
 * A failing story test lists its steps in the failure message, so a red run
 * shows how far the story got without opening the report.
 *
 * Each failing case is `it.fails`. Its onTestFailed capture hook is registered
 * before story.init; hooks run last-in, first-out, so it reads the message
 * after story's own hook has annotated it.
 */
import { describe, it, expect, onTestFailed } from 'vitest';
import { story } from '../index';
import { STEP_TRAIL_MARKER } from '../step-trail';

const messages: Record<string, string> = {};
const capture = (key: string) =>
  onTestFailed(({ task }) => {
    messages[key] = String(task.result?.errors?.[0]?.message);
  });

describe('failure step trail', () => {
  it.fails('marker steps: the last claim is the one that failed', ({ task }) => {
    capture('marker');
    story.init(task);
    story.given('a balance of 50');
    story.when('100 is deposited');
    story.then('the balance is 150');
    expect(50 + 100).toBe(151);
  });

  it.fails('wrapped step: the body that threw is marked', ({ task }) => {
    capture('wrapped');
    story.init(task);
    story.given('setup', () => {});
    story.when('it breaks', () => {
      throw new Error('kaput');
    });
    story.then('never reached');
  });

  it.fails('failure after a finished wrapped step', ({ task }) => {
    capture('after');
    story.init(task);
    story.given('setup', () => {});
    throw new Error('later');
  });

  it.fails('soft assertion in a wrapped step', ({ task }) => {
    capture('soft-wrapped');
    story.init(task);
    story.then('the value is right', () => expect.soft(1).toBe(2));
    story.then('the next check passes', () => expect(1).toBe(1));
  });

  it.fails('soft assertion after a marker', ({ task }) => {
    capture('soft-marker');
    story.init(task);
    story.given('a value');
    expect.soft(1).toBe(2);
    story.then('the rest holds');
    expect(1).toBe(1);
  });

  it.fails('a caught throw does not own a later failure', ({ task }) => {
    capture('caught');
    story.init(task);
    expect(() =>
      story.given('a rejected input', () => {
        throw new Error('rejected');
      }),
    ).toThrow('rejected');
    story.then('the total is 3');
    expect(1).toBe(3);
  });

  it.fails('nested steps mark the inner one that threw', ({ task }) => {
    capture('nested');
    story.init(task);
    story.when('the order is placed', () => {
      story.and('payment is taken', () => {
        throw new Error('declined');
      });
    });
  });

  let attempt = 0;
  it.fails('a retry lists the steps once per error', { retry: 1 }, ({ task }) => {
    capture('retry');
    story.init(task);
    story.given(`attempt ${++attempt}`);
    expect(attempt).toBe(0);
  });

  it('appends a checklist after the original message', () => {
    expect(messages.marker).toBe(
      'expected 150 to be 151 // Object.is equality' +
        STEP_TRAIL_MARKER +
        '  ✓ Given a balance of 50\n  ✓ When 100 is deposited\n  ✗ Then the balance is 150',
    );
    expect(messages.wrapped).toBe(
      'kaput' + STEP_TRAIL_MARKER + '  ✓ Given setup\n  ✗ When it breaks',
    );
    expect(messages['soft-wrapped']).toContain(
      STEP_TRAIL_MARKER + '  ✗ Then the value is right\n  ✓ And the next check passes',
    );
    expect(messages['soft-marker']).toContain(
      STEP_TRAIL_MARKER + '  ✗ Given a value\n  ✓ Then the rest holds',
    );
    expect(messages.caught).toContain(STEP_TRAIL_MARKER + '  ✓ Given a rejected input\n  ✗ Then the total is 3');
    expect(messages.nested).toContain(
      STEP_TRAIL_MARKER + '  ✓ When the order is placed\n  ✗ And payment is taken',
    );
    expect(messages.retry.split(STEP_TRAIL_MARKER)).toHaveLength(2);
    expect(messages.after).toBe(
      'later' + STEP_TRAIL_MARKER + '  ✓ Given setup\n  ✗ (failed after the last step)',
    );
  });
});
