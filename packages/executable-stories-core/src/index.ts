/**
 * executable-stories-core — types + canonicalize transform + doc model +
 * theme tokens. Node-only (attachment resolution reads the filesystem); no CLI,
 * server, publishers, or notifiers. Depended on by the formatters CLI and the
 * Astro integration so canonicalization never forks.
 */

// Types (Layer 1 raw + Layer 2 canonical + report + doc model)
export * from "./types/raw.js";
export * from "./types/test-result.js";
export * from "./types/story.js";
export * from "./types/story-report.js";
export * from "./types/cucumber-messages.js";
export * from "./types/otel.js";
export * from "./types/canonicalize.js";
export * from "./types/ci.js";
// Disambiguate names that story-report.ts re-exports from story/test-result
// (TS2308): the explicit re-export below wins over the `export *` overlap.
export type { StepKeyword, StepMode } from "./types/story.js";
export type { TestStatus, CIInfo } from "./types/test-result.js";

// ACL: raw -> canonical
export * from "./converters/acl/index.js";

// Canonical -> StoryReport + synthesis + ndjson
export * from "./converters/synthesize.js";
export * from "./converters/story-report.js";
export * from "./converters/ndjson-parser.js";

// Theme tokens (shared design system)
export * from "./theme/tokens.js";

// Session trajectory primitive (ported from serve.ts)
export * from "./trajectory.js";

// Explainer freshness contract (also available via the ./explainer subpath).
// Re-exported here so dependents can pull the types from the package's main
// entry, which their dts bundlers inline (subpath types are not, so a public
// type that referenced the subpath would leak an import of an unpublished
// package into the dependent's own .d.ts).
export * from "./explainer.js";

// Pure doc/render helpers
export * from "./utils/scenario-markdown.js";
export * from "./utils/doc-builders.js";
export * from "./utils/source-file.js";
export * from "./utils/duration.js";
