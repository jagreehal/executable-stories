/**
 * vitest-executable-stories: TS-first scenario/given/when/then for Vitest with Markdown doc generation.
 *
 * This is Vitest, not Cucumber:
 * - scenario() is describe() with story metadata
 * - Steps are it() tests with keyword labels
 * - All Vitest modifiers work: .skip, .only, .todo, .fails, .concurrent
 *
 * 1. Author tests with scenario(), given(), when(), then(), and() from this package.
 * 2. Add the StoryReporter to vitest.config (reporters: ['default', new StoryReporter()]).
 * 3. Run vitest; docs/user-stories.md (or your outputFile) is written with user-story style Markdown.
 */
export {
  scenario,
  type StepsApi,
  type StoryMeta,
  type StoryStep,
  type StepKeyword,
  type StepMode,
  type StepFn,
  type ScenarioOptions,
  type ScenarioFn,
  type DocEntry,
  type DocPhase,
  type DocApi,
  type DocRuntimeApi,
  STORY_META_KEY,
} from "./bdd.js";
export { default as StoryReporter, type StoryReporterOptions, type OutputRule, type CustomDocRenderer } from "./reporter.js";
