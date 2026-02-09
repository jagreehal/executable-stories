/**
 * Demos: framework-native test + story.init(), optional step (marker only), arrange.
 * Use it() + story.init() + story.given/when/then/arrange as markers (no callbacks).
 */
import { describe, expect, it, test } from '@jest/globals';
import { story } from 'executable-stories-jest';
import { add } from './calculator.js';

test('Calculator sum (framework native)', () => {
  story.init();
  expect(add(1, 2)).toBe(3);
});

describe('Optional step demo (steps are markers only)', () => {
  it('Optional step callback demo', () => {
    story.init();
    story.given('two numbers 1 and 2');
    story.arrange('we are about to add');
    story.when('add is called');
    story.then('the result is 3');
    expect(add(1, 2)).toBe(3);
  });
});
