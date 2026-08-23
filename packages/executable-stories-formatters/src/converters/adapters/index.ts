/**
 * Framework adapters - Layer 1.
 *
 * Transform framework-specific data to RawRun for ACL processing.
 *
 * This file exists as the published `executable-stories-formatters/adapters`
 * entry point (see tsup.config.ts). Source inside this package imports the
 * concrete adapter modules instead of reaching through here.
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
