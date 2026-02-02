/**
 * playwright-executable-stories: TS-first story/given/when/then for Playwright with Markdown doc generation.
 *
 * 1. Author tests with story(), given(), when(), then(), and() from this package.
 * 2. Add the StoryReporter to playwright.config (reporters: ['list', new StoryReporter()]).
 * 3. Run playwright test; docs/user-stories.md (or your output config) is written with user-story style Markdown.
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
  type StoryOptions,
  type StoryFn,
  type PlaywrightTestArgs,
  type DocEntry,
  type DocPhase,
  type DocApi,
  type DocRuntimeApi,
  STORY_ANNOTATION_TYPE,
  STORY_RUNTIME_DOC_ANNOTATION_TYPE,
} from "./bdd.js";
export {
  default as StoryReporter,
  type StoryReporterOptions,
  type OutputRule,
  type CustomDocRenderer,
} from "./reporter.js";
