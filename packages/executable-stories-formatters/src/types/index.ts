/**
 * Type exports for @executable-stories/formatters
 */

// Story types (shared vocabulary for all adapters)
export type {
  StepKeyword,
  StepMode,
  DocPhase,
  DocEntry,
  StoryStep,
  StoryMeta,
  NormalizedTicket,
} from "./story";
export { STORY_META_KEY } from "./story";

// OTel span types (trace waterfall rendering)
export type { OtelSpan, OtelAttributeValue } from "./otel";

// Raw types (Layer 1 - Framework Adapters)
export type {
  RawStatus,
  RawAttachment,
  RawStepEvent,
  RawTestCase,
  RawCIInfo,
  RawRun,
} from "./raw";

// Canonical types (Layer 2 - ACL output)
export type {
  TestStatus,
  StepResult,
  Attachment,
  TestCaseResult,
  CIInfo,
  TestRunResult,
} from "./test-result";

// Cucumber JSON types (Layer 3 - Formatter output)
export type {
  IJsonTag,
  IJsonDocString,
  IJsonTableRow,
  IJsonDataTable,
  IJsonStepArgument,
  IJsonEmbedding,
  IJsonStepResult,
  IJsonStep,
  IJsonScenario,
  IJsonFeature,
} from "./cucumber-json";

// Cucumber Messages types (Layer 3 - Formatter output)
export type {
  Timestamp,
  Duration,
  Location,
  Meta,
  Source,
  Tag,
  KeywordType,
  DocString,
  TableCell,
  TableRow,
  DataTable,
  Step,
  Scenario,
  Feature,
  GherkinDocument,
  PickleStepType,
  PickleDocString,
  PickleTableCell,
  PickleTableRow,
  PickleTable,
  PickleStepArgument,
  PickleStep,
  Pickle,
  TestStepResultStatus,
  TestStepResult,
  TestStep,
  TestCase,
  TestRunStarted,
  TestCaseStarted,
  TestStepStarted,
  TestStepFinished,
  TestCaseFinished,
  TestRunFinished,
  CucumberAttachment,
  Envelope,
} from "./cucumber-messages";

// Options types
export type {
  CanonicalizeOptions,
  OutputFormat,
  FormatterOptions,
  ResolvedFormatterOptions,
} from "./options";
