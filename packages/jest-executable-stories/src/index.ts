/**
 * jest-executable-stories: TS-first story/given/when/then for Jest with Markdown doc generation.
 *
 * This is Jest, not Cucumber:
 * - story() is describe() with story metadata
 * - Steps are test() cases with keyword labels
 * - Supported modifiers: .skip, .only, .todo, .fails (via test.failing), .concurrent (when available)
 *
 * 1. Author tests with story(), given(), when(), then(), and() from this package.
 * 2. Add the StoryReporter to jest.config (reporters: ['default', ['jest-executable-stories/reporter', {...}]]).
 * 3. Run jest; docs/user-stories.md (or your outputFile) is written with user-story style Markdown.
 */
export {
  story,
  // BDD keywords
  given,
  when,
  then,
  and,
  but,
  // AAA pattern aliases
  arrange,
  act,
  assert,
  // Additional aliases
  setup,
  context,
  execute,
  action,
  verify,
  // Documentation API
  doc,
  // Steps API object
  steps,
  step,
  // Types
  type StepsApi,
  type StoryMeta,
  type StoryStep,
  type StepKeyword,
  type StepMode,
  type StepFn,
  type StoryOptions,
  type StoryFn,
  type DocStoryFn,
  type DocEntry,
  type DocPhase,
  type DocApi,
  type DocRuntimeApi,
  STORY_META_KEY,
} from "./bdd.js";
export { default as StoryReporter, type StoryReporterOptions, type OutputRule, type CustomDocRenderer } from "./reporter.js";
