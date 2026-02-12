/**
 * Jest Executable Stories
 *
 * BDD-style executable documentation for Jest.
 *
 * @example
 * ```ts
 * import { story } from 'executable-stories-jest';
 *
 * describe('Calculator', () => {
 *   it('adds two numbers', () => {
 *     story.init();
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
export { story } from "./story-api";
export type { Story } from "./story-api";

// Re-export types
export type {
  StoryMeta,
  StoryStep,
  DocEntry,
  StepKeyword,
  StepMode,
  DocPhase,
  StoryDocs,
  StoryOptions,
  AttachmentOptions,
  KvOptions,
  JsonOptions,
  CodeOptions,
  TableOptions,
  LinkOptions,
  SectionOptions,
  MermaidOptions,
  ScreenshotOptions,
  CustomOptions,
} from "./types";

export { STORY_META_KEY } from "./types";
