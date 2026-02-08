/**
 * Refactor Guide: From existing Playwright tests to executable-stories.
 * Use test.describe/test + story.init(testInfo) + story.given/when/then (markers only).
 */
import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';
import { add, multiply, subtract } from './calculator.js';

test.describe('Part 1: Existing (no library)', () => {
  test('Step 0 — Starting point: plain test, no story, no docs', async () => {
    expect(add(2, 3)).toBe(5);
  });
});

test.describe('Part 2: Introduce story (test + story.init(testInfo))', () => {
  test('Calculator adds two numbers', async ({}, testInfo) => {
    story.init(testInfo);
    story.given('two numbers 2 and 3');
    const a = 2;
    const b = 3;
    story.when('they are added');
    const result = add(a, b);
    story.then('the result is 5');
    expect(result).toBe(5);
  });
});

test.describe('Part 3: Framework-native with story.init(testInfo)', () => {
  test('Step 2 — Keep test(), add story.init(): existing test appears in docs', async ({}, testInfo) => {
    story.init(testInfo);
    expect(subtract(10, 4)).toBe(6);
  });
});

test.describe('Part 4: Full patterns', () => {
  test('Calculator multiplies two numbers', async ({}, testInfo) => {
    story.init(testInfo);
    story.given('two numbers 7 and 6');
    story.when('they are multiplied');
    story.then('the result is 42');
    expect(multiply(7, 6)).toBe(42);
  });

  test('Step 3b — Framework-native test with story.init() in the same describe', async ({}, testInfo) => {
    story.init(testInfo);
    expect(multiply(7, 6)).toBe(42);
  });

  test('Calculator adds with a note', async ({}, testInfo) => {
    story.init(testInfo);
    story.note(
      'Using small numbers; the note appears in the generated Markdown.',
    );
    story.given('two numbers 1 and 2');
    story.when('they are added');
    story.then('the result is 3');
    expect(add(1, 2)).toBe(3);
  });
});
