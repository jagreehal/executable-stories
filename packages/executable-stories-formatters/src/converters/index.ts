/**
 * Converters - ACL and adapters.
 */

// ACL (Layer 2)
export { canonicalizeRun } from "executable-stories-core/converters/acl/canonicalize";
export { normalizeStatus } from "executable-stories-core/converters/acl/status";
export {
  generateTestCaseId,
  generateRunId,
  slugify,
} from "executable-stories-core/converters/acl/ids";
export {
  deriveStepResults,
  mergeStepResults,
} from "executable-stories-core/converters/acl/steps";
export {
  resolveAttachment,
  resolveAttachments,
} from "executable-stories-core/converters/acl/attachments";

export {
  validateCanonicalRun,
  assertValidRun,
  type ValidationResult,
} from "executable-stories-core/converters/acl/validate";

// Framework adapters (Layer 1)
export { adaptJestRun } from "./adapters/jest";
export { adaptVitestRun } from "./adapters/vitest";
export { adaptPlaywrightRun } from "./adapters/playwright";

// Re-export adapter types
export type {
  JestTestResult,
  JestFileResult,
  JestAggregatedResult,
  StoryFileReport,
  JestAdapterOptions,
} from "./adapters/jest";
export type {
  VitestState,
  VitestSerializedError,
  VitestTestResult,
  VitestTestCase,
  VitestTestModule,
  VitestAdapterOptions,
} from "./adapters/vitest";
export type {
  PlaywrightStatus,
  PlaywrightError,
  PlaywrightAttachment,
  PlaywrightTestResult,
  PlaywrightAnnotation,
  PlaywrightLocation,
  PlaywrightTestCase,
  PlaywrightAdapterOptions,
} from "./adapters/playwright";
