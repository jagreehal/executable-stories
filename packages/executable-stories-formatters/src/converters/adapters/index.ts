/**
 * Framework adapters - Layer 1.
 *
 * Transform framework-specific data to RawRun for ACL processing.
 */

export {
  adaptJestRun,
  type JestTestResult,
  type JestFileResult,
  type JestAggregatedResult,
  type StoryFileReport,
  type JestAdapterOptions,
} from "./jest";

export {
  adaptVitestRun,
  type VitestState,
  type VitestSerializedError,
  type VitestTestResult,
  type VitestTestCase,
  type VitestTestModule,
  type VitestAdapterOptions,
} from "./vitest";

export {
  adaptPlaywrightRun,
  type PlaywrightStatus,
  type PlaywrightError,
  type PlaywrightAttachment,
  type PlaywrightTestResult,
  type PlaywrightAnnotation,
  type PlaywrightLocation,
  type PlaywrightTestCase,
  type PlaywrightAdapterOptions,
} from "./playwright";
