/**
 * A failing story test lists its steps in the failure, so a red run shows how
 * far the story got without opening the report.
 *
 * The worker records which steps failed in an annotation, and the reporter
 * builds the checklist from it at onTestEnd. Each failing case is `test.fail`;
 * the afterEach below captures what the reporter would read, and the last
 * tests build the checklist from it.
 */
import { test, expect } from '@playwright/test';
import { story } from '../story-api';
import {
  STEP_TRAIL_MARKER,
  TRAIL_ANNOTATION,
  appendStepTrail,
  formatStepTrail,
  stripStepTrail,
  type TrailState,
} from '../step-trail';

const trails: Record<string, string> = {};
test.afterEach(({}, testInfo) => {
  const meta = testInfo.annotations.find((a) => a.type === 'story-meta')?.description;
  const state = testInfo.annotations.find((a) => a.type === TRAIL_ANNOTATION)?.description;
  if (!meta || !state) return;
  const steps = JSON.parse(meta).steps;
  trails[testInfo.title] = formatStepTrail(steps, JSON.parse(state) as TrailState, testInfo.errors.length);
});

test.describe.configure({ mode: 'serial' });

test.fail('marker steps', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('a balance of 50');
  story.when('100 is deposited');
  story.then('the balance is 150');
  throw new Error('marker');
});

test.fail('wrapped step', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('setup', () => {});
  story.when('it breaks', () => {
    throw new Error('wrapped');
  });
});

test.fail('after a finished wrapped step', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('setup', () => {});
  throw new Error('after');
});

test.fail('soft assertion in a wrapped step', async ({}, testInfo) => {
  story.init(testInfo);
  story.then('the value is right', () => expect.soft(1).toBe(2));
  story.then('the next check passes', () => expect(1).toBe(1));
});

test.fail('soft assertion after a marker', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('a value');
  expect.soft(1).toBe(2);
  story.then('the rest holds');
  expect(1).toBe(1);
});

test.fail('a caught throw does not own a later failure', async ({}, testInfo) => {
  story.init(testInfo);
  expect(() =>
    story.given('a rejected input', () => {
      throw new Error('rejected');
    }),
  ).toThrow('rejected');
  story.then('the total is 3');
  throw new Error('later');
});

test.fail('nested steps mark the inner one that threw', async ({}, testInfo) => {
  story.init(testInfo);
  story.when('the order is placed', () => {
    story.and('payment is taken', () => {
      throw new Error('declined');
    });
  });
});

test('builds a checklist from what the worker recorded', () => {
  expect(trails).toEqual({
    'marker steps': STEP_TRAIL_MARKER + '  ✓ Given a balance of 50\n  ✓ When 100 is deposited\n  ✗ Then the balance is 150',
    'wrapped step': STEP_TRAIL_MARKER + '  ✓ Given setup\n  ✗ When it breaks',
    'after a finished wrapped step': STEP_TRAIL_MARKER + '  ✓ Given setup\n  ✗ (failed after the last step)',
    'soft assertion in a wrapped step':
      STEP_TRAIL_MARKER + '  ✗ Then the value is right\n  ✓ And the next check passes',
    'soft assertion after a marker': STEP_TRAIL_MARKER + '  ✗ Given a value\n  ✓ Then the rest holds',
    'a caught throw does not own a later failure':
      STEP_TRAIL_MARKER + '  ✓ Given a rejected input\n  ✗ Then the total is 3',
    'nested steps mark the inner one that threw':
      STEP_TRAIL_MARKER + '  ✓ When the order is placed\n  ✗ And payment is taken',
  });
});

test('puts the checklist in the message and the stack once, and strips it back out', () => {
  const trail = STEP_TRAIL_MARKER + '  ✗ Then it holds';
  const errors = [{ message: 'boom', stack: 'boom\n    at spec.ts:1:1' }];
  appendStepTrail(errors, trail);
  appendStepTrail(errors, trail);
  expect(errors[0]).toEqual({ message: 'boom' + trail, stack: 'boom' + trail + '\n    at spec.ts:1:1' });
  expect(stripStepTrail(errors[0])).toEqual({ message: 'boom', stack: 'boom\n    at spec.ts:1:1' });
});
