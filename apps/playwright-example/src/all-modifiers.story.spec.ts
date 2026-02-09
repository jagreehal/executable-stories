/**
 * Comprehensive demonstration of ALL step modifiers available in Playwright (v1).
 * No step-level .skip, .todo, .fails — use test.skip(), test.fixme() for whole test.
 * This file is skipped with a note.
 */
import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

test.describe
  .skip('Step modifiers (no step.skip/step.todo/step.fails; use test.skip/test.fixme for whole test)', () => {
  test('Skip modifier demonstration', async ({}, testInfo) => {
    story.init(testInfo);
    story.note('The .skip modifier — use test.skip() for whole test');
    story.given('a normal precondition');
    story.when('a normal action');
    story.then('a normal assertion');
    expect(true).toBe(true);
  });

  test('Todo modifier demonstration', async ({}, testInfo) => {
    story.init(testInfo);
    story.note('The .todo modifier — use test.fixme() for whole test');
    story.given('setup is complete');
    story.when('action is performed');
    story.then('assertion passes');
    expect(true).toBe(true);
  });
});
