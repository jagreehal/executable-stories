/**
 * executable-stories-vitest: Native Vitest story/given/when/then with Markdown doc generation.
 *
 * Uses native Vitest describe/it/test for full IDE support:
 *
 * @example
 * ```ts
 * import { describe, it, expect } from 'vitest';
 * import { story } from 'executable-stories-vitest';
 *
 * describe('Calculator', () => {
 *   it('adds two numbers', ({ task }) => {
 *     story.init(task);
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
 *
 * In vitest.config, import StoryReporter from "executable-stories-vitest/reporter":
 *
 * @example
 * ```ts
 * import { defineConfig } from "vitest/config";
 * import { StoryReporter } from "executable-stories-vitest/reporter";
 *
 * export default defineConfig({
 *   test: {
 *     reporters: ["default", new StoryReporter()],
 *   },
 * });
 * ```
 */

// Core API
export { story, type Story } from './story-api';

// Types for consumers
export type {
  StoryMeta,
  StoryStep,
  DocEntry,
  StepKeyword,
  StepMode,
  DocPhase,
  StoryDocs,
  StoryOptions,
  VitestTask,
  VitestSuite,
} from './types';

export { STORY_META_KEY } from './types';

// Reporter types (actual reporter is in /reporter subpath)
export type {
  StoryReporterOptions,
  OutputFormat,
  OutputMode,
  ColocatedStyle,
  OutputRule,
  FormatterOptions,
} from './reporter';

const STORY_REPORTER_GUARD_MSG =
  'Do not import StoryReporter from "executable-stories-vitest". In vitest.config, import it from "executable-stories-vitest/reporter".';

/** @internal Guard: throws if used. Import StoryReporter from "executable-stories-vitest/reporter" in vitest.config. */
export class StoryReporter {
  static __isGuard = true;
  constructor() {
    throw new Error(STORY_REPORTER_GUARD_MSG);
  }
}
