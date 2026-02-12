/**
 * Converters - ACL and adapters.
 */

// ACL (Layer 2)
export {
  canonicalizeRun,
  normalizeStatus,
  generateTestCaseId,
  generateRunId,
  slugify,
  deriveStepResults,
  mergeStepResults,
  resolveAttachment,
  resolveAttachments,
} from "./acl/index";

export {
  validateCanonicalRun,
  assertValidRun,
  type ValidationResult,
} from "./acl/validate";

// Framework adapters (Layer 1)
export {
  adaptJestRun,
  adaptVitestRun,
  adaptPlaywrightRun,
} from "./adapters/index";

// Re-export adapter types
export type {
  JestTestResult,
  JestFileResult,
  JestAggregatedResult,
  StoryFileReport,
  JestAdapterOptions,
  VitestState,
  VitestSerializedError,
  VitestTestResult,
  VitestTestCase,
  VitestTestModule,
  VitestAdapterOptions,
  PlaywrightStatus,
  PlaywrightError,
  PlaywrightAttachment,
  PlaywrightTestResult,
  PlaywrightAnnotation,
  PlaywrightLocation,
  PlaywrightTestCase,
  PlaywrightAdapterOptions,
} from "./adapters/index";
