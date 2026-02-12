/**
 * Playwright Executable Stories
 *
 * BDD-style executable documentation for Playwright Test.
 *
 * @example
 * ```ts
 * import { test, expect } from '@playwright/test';
 * import { story } from 'executable-stories-playwright';
 *
 * test.describe('Calculator', () => {
 *   test('adds two numbers', async ({ page }, testInfo) => {
 *     story.init(testInfo);
 *
 *     story.given('two numbers 5 and 3');
 *     const a = 5;
 *     const b = 3;
 *
 *     story.when('I add them together');
 *     const result = a + b;
 *
 *     story.then('the result is 8');
 *     expect(result).toBe(8);
 *   });
 * });
 * ```
 */

// Story API
export { story } from './story-api';
export type { Story } from './story-api';

// Re-export types from local types module
export type {
  StoryMeta,
  StoryStep,
  DocEntry,
  StepKeyword,
  StoryDocs,
  StoryOptions,
  KvOptions,
  JsonOptions,
  CodeOptions,
  TableOptions,
  LinkOptions,
  SectionOptions,
  MermaidOptions,
  ScreenshotOptions,
  CustomOptions,
} from './types';
