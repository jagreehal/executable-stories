/**
 * Demos: framework-native test + story.init(task), optional step callback, arrange/step.
 * it() + story.init(task) + story.given/when/then (markers only).
 */
import { story } from 'executable-stories-vitest';
import { expect, it } from 'vitest';
import { add } from './calculator.js';

// Framework-native: it('xxx', ({ task }) => { story.init(task); ... })
it('Calculator sum (framework native)', ({ task }) => {
  story.init(task);
  expect(add(1, 2)).toBe(3);
});

// Optional step callback: given/when/arrange are markers only
it('Optional step callback demo', ({ task }) => {
  story.init(task);
  story.given('two numbers 1 and 2');
  story.arrange('we are about to add');
  story.when('add is called');
  story.then('the result is 3');
  expect(add(1, 2)).toBe(3);
});
