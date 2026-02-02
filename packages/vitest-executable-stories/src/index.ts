/**
 * vitest-executable-stories: TS-first story/given/when/then for Vitest with Markdown doc generation.
 *
 * This is Vitest, not Cucumber:
 * - story() is describe() with story metadata
 * - Steps are it() tests with keyword labels
 * - All Vitest modifiers work: .skip, .only, .todo, .fails, .concurrent
 *
 * 1. Author tests with story(); in the callback use steps.given(), steps.when(), steps.then(), etc.
 * 2. In vitest.config, import StoryReporter from "vitest-executable-stories/reporter" (not from this package).
 * 3. Run vitest; docs/user-stories.md (or your outputFile) is written with user-story style Markdown.
 */
export {
  story,
  type StepsApi,
  type StoryMeta,
  type StoryStep,
  type StepKeyword,
  type StepMode,
  type StepFn,
  type StoryOptions,
  type StoryFn,
  type DocEntry,
  type DocPhase,
  type DocApi,
  type DocRuntimeApi,
  STORY_META_KEY,
} from "./bdd.js";
export {
  given,
  when,
  and,
  but,
  arrange,
  act,
  assert,
  setup,
  context,
  execute,
  action,
  verify,
  doc,
  steps,
  step,
} from "./steps.js";

const STORY_REPORTER_GUARD_MSG =
  'Do not import StoryReporter from "vitest-executable-stories". In vitest.config, import it from "vitest-executable-stories/reporter".';

/** @internal Guard: throws if used. Import StoryReporter from "vitest-executable-stories/reporter" in vitest.config. */
export class StoryReporter {
  static __isGuard = true;
  constructor() {
    throw new Error(STORY_REPORTER_GUARD_MSG);
  }
}

export type { StoryReporterOptions, OutputRule, CustomDocRenderer } from "./reporter.js";
