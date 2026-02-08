/**
 * Comprehensive API variations test for Jest.
 * describe/it + story.init() + story.given/when/then (markers only).
 * Skipped: steps object, step prefix, step modifiers (no step-level .skip/.todo).
 */
import { expect, it, test } from '@jest/globals';
import { story } from 'executable-stories-jest';

// 1. Framework-native with story.init()
test('Framework native with doc.story', () => {
  story.init();
  expect(true).toBe(true);
});

// 2. Optional callbacks → steps are markers only (no callbacks)
it('Optional callbacks for all step keywords', () => {
  story.init();
  story.given('given context without callback');
  story.when('when action without callback');
  story.then('then assertion without callback');
  story.and('and additional step without callback');
  story.arrange('arrange context without callback');
  story.act('act action without callback');
  story.assert('assert with callback');
  expect(true).toBe(true);
  story.setup('setup context without callback');
  story.context('context setup without callback');
  story.execute('execute action without callback');
  story.action('action execute without callback');
  story.verify('verify with callback');
  expect(true).toBe(true);
});

// 3. steps object style — no steps/step object; use story.given/when/then
it.skip('Using steps object (no steps callback param; use story.given/when/then)', () => {
  story.init();
  story.given('context via steps param');
  story.when('action via steps param');
  story.then('assertion via steps param');
  expect(true).toBe(true);
});

it.skip('Using step prefix (no step.* alias; use story.given/when/then)', () => {
  story.init();
  story.given('context via step prefix');
  story.when('action via step prefix');
  story.then('assertion via step prefix');
  expect(true).toBe(true);
});

// 4. Multiple steps → And
it('Multiple steps become And', () => {
  story.init();
  story.given('first given');
  story.given('second given becomes And');
  story.when('first when');
  story.when('second when becomes And');
  story.then('first then');
  expect(true).toBe(true);
  story.then('second then becomes And');
  expect(true).toBe(true);
});

// 5. Step modifiers — no step-level .skip/.todo; use it.skip/it.todo for whole test
it.skip('Step modifiers (no step.skip/step.todo; use it.skip/it.todo for whole test)', () => {
  story.init();
  story.given('normal step');
  story.then('final assertion');
  expect(true).toBe(true);
});

// 6. Story with metadata
it('Story with metadata', () => {
  story.init({ tags: ['smoke', 'api'], ticket: 'JIRA-123' });
  story.given('context');
  story.then('assertion');
  expect(true).toBe(true);
});

// 7. story.note(), story.tag(), story.kv()
it('Story with notes and tags', () => {
  story.init();
  story.note('This is a note about the story');
  story.tag('smoke');
  story.tag(['api', 'important']);
  story.given('context');
  story.kv({ label: 'key', value: 'value' });
  story.then('assertion');
  expect(true).toBe(true);
});
