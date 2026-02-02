/**
 * playwright-executable-stories: TS-first scenario/given/when/then for Playwright with Markdown doc generation.
 *
 * 1. Author tests with scenario(), given(), when(), then(), and() from this package.
 * 2. Add the StoryReporter to playwright.config (reporters: ['list', new StoryReporter()]).
 * 3. Run playwright test; docs/user-stories.md (or your output config) is written with user-story style Markdown.
 */
export {
  scenario,
  type StepsApi,
  type StoryMeta,
  type StoryStep,
  type StepKeyword,
  type StepMode,
  type ScenarioOptions,
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
