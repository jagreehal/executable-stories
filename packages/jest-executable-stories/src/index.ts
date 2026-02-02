/**
 * jest-executable-stories: TS-first scenario/given/when/then for Jest with Markdown doc generation.
 *
 * This is Jest, not Cucumber:
 * - scenario() is describe() with story metadata
 * - Steps are test() cases with keyword labels
 * - Supported modifiers: .skip, .only, .todo, .fails (via test.failing), .concurrent (when available)
 *
 * 1. Author tests with scenario(), given(), when(), then(), and() from this package.
 * 2. Add the StoryReporter to jest.config (reporters: ['default', ['jest-executable-stories/reporter', {...}]]).
 * 3. Run jest; docs/user-stories.md (or your outputFile) is written with user-story style Markdown.
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
