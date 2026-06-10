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
import { story, doc, getAndClearMeta } from './story-api';
import type { StepMarker } from './story-api';
export { story, doc, getAndClearMeta };
export type { Story, RecordMetaPayload, StepMarker } from './story-api';

// Top-level step helpers (framework contract)
export const given: StepMarker = story.given;
export const when: StepMarker = story.when;
export const then: StepMarker = story.then;
export const and: StepMarker = story.and;
export const but: StepMarker = story.but;

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
  VideoOptions,
  HtmlOptions,
  CustomOptions,
} from './types';
