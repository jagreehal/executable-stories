/**
 * Comprehensive demonstration of ALL step modifiers available in Jest (v1).
 * No step-level .skip, .todo, .fails — use it.skip(), it.todo() for whole test.
 * This file is skipped with a note; individual tests could be migrated without modifiers.
 */
import { describe } from '@jest/globals';
import { story } from 'executable-stories-jest';

describe.skip('Step modifiers (no step.skip/step.todo/step.fails; use it.skip/it.todo for whole test)', () => {
  it('Skip modifier demonstration', () => {
    story.init();
    story.note(
      'The .skip modifier skips a step without failing the test suite — use it.skip() for whole test',
    );
    story.given('a normal precondition');
    story.when('a normal action');
    story.then('a normal assertion');
    expect(true).toBe(true);
  });

  it('Todo modifier demonstration', () => {
    story.init();
    story.note(
      'The .todo modifier marks a step as pending — use it.todo() for whole test',
    );
    story.given('setup is complete');
    story.when('action is performed');
    story.then('assertion passes');
    expect(true).toBe(true);
  });
});
