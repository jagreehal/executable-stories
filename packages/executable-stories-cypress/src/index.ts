/**
 * Cypress Executable Stories
 *
 * BDD-style executable documentation for Cypress.
 *
 * @example
 * ```ts
 * import { story } from 'executable-stories-cypress';
 *
 * describe('Calculator', () => {
 *   it('adds two numbers', () => {
 *     story.init();
 *
 *     story.given('two numbers 5 and 3');
 *     const a = 5, b = 3;
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
export { story, getAndClearMeta } from './story-api';
export type { Story, RecordMetaPayload } from './story-api';

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
