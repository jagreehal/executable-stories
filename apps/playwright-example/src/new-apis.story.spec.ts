/**
 * Demos: framework-native test + story.init(testInfo), optional step (marker only), arrange.
 */
import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';
import { add } from './calculator.js';

test('Calculator sum (framework native)', async ({}, testInfo) => {
  story.init(testInfo);
  expect(add(1, 2)).toBe(3);
});

test('Optional step callback demo', async ({}, testInfo) => {
  story.init(testInfo);
  story.given('two numbers 1 and 2');
  story.arrange('we are about to add');
  story.when('add is called');
  story.then('the result is 3');
  expect(add(1, 2)).toBe(3);
});
