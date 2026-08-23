/**
 * @executable-stories/formatters
 *
 * Cucumber-compatible report formats (JSON, HTML, JUnit, Markdown)
 * for Jest, Vitest, and Playwright test results.
 *
 * Architecture:
 * - Layer 1: Framework Adapters (adaptJestRun, adaptVitestRun, adaptPlaywrightRun)
 * - Layer 2: Anti-Corruption Layer (canonicalizeRun)
 * - Layer 3: Formatters (CucumberJsonFormatter, JUnitFormatter, MarkdownFormatter; the
 *   HTML report renders via executable-stories-react — the `html` format)
 */

import * as path from "node:path";

import * as fsPromises from "node:fs/promises";
import type { TestRunResult } from "executable-stories-core/types/test-result";
import type { CanonicalizeOptions } from "./types/options";
import type { RawRun } from "executable-stories-core/types/raw";

import { canonicalizeRun } from "executable-stories-core/converters/acl/canonicalize";
import { diffRuns } from "./compare/diff-runs";
import { RunDiffChangelogFormatter } from "./formatters/run-diff-changelog";
import { RunDiffHtmlFormatter } from "./formatters/run-diff-html";
import { RunDiffMarkdownFormatter } from "./formatters/run-diff-markdown";

// Import adapters for convenience functions
import { adaptJestRun } from "./converters/adapters/jest";
import { adaptVitestRun } from "./converters/adapters/vitest";
import { adaptPlaywrightRun } from "./converters/adapters/playwright";

// ============================================================================
// Type Exports
// ============================================================================

// Story types (shared vocabulary for all adapters)
export type {
  StepKeyword,
  StepMode,
  DocPhase,
  DocEntry,
  StoryStep,
  StoryMeta,
  NormalizedTicket,
} from "executable-stories-core/types/story";
export { STORY_META_KEY } from "executable-stories-core/types/story";

// OTel span types (trace waterfall rendering)
export type { OtelSpan, OtelAttributeValue } from "executable-stories-core/types/otel";

// Canonical types (Layer 2 output - what formatters accept)
export type {
  TestStatus,
  StepResult,
  Attachment,
  TestCaseResult,
  TestCaseAttempt,
  TestCaseEvidence,
  CIInfo,
  CoverageSummary,
  FeatureDeclaration,
  GlossaryTerm,
  TestRunResult,
} from "executable-stories-core/types/test-result";

// Raw types (Layer 1 - for adapter authors)
export type {
  RawStatus,
  RawAttachment,
  RawStepEvent,
  RawTestCase,
  RawCIInfo,
  RawRun,
  RawFeature,
  RawGlossaryTerm,
} from "executable-stories-core/types/raw";

// Cucumber JSON types (Layer 3 output)
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
} from "./types/cucumber-json";

// Formatter plugin types
export type { Formatter, ExecutableStoriesConfig } from "./types/formatter";

// Test-management sync: the port, the engine, and the built-in adapters.
// The port is a plain object, so a third-party provider is a value someone can
// construct — no plugin machinery needed if we ever expose it from config.
export type {
  SyncProvider,
  RemoteCase,
  CaseBody,
  CaseResult,
  ResultAttachment,
  RecordResultsSummary,
  AdapterDeps,
} from "./sync/port";
export {
  analyzeSync,
  applySync,
  projectBehaviours,
  toCaseBody,
  collectAttachments,
  type SyncAnalysis,
  type SyncApplyResult,
  type SyncEngineConfig,
  type AttachPolicy,
  type CoverageClass,
} from "./sync/engine";
export {
  renderCoverageText,
  renderCoverageMarkdown,
  renderPlan,
  renderApplyResult,
  buildCoverageJson,
  type CoverageJson,
} from "./sync/report";
export {
  buildProvider,
  isProviderName,
  PROVIDER_NAMES,
  type ProviderName,
  type SyncTargets,
} from "./sync/adapters/registry";
export { createTestRailProvider, type TestRailConfig } from "./sync/adapters/testrail";
export { createXrayProvider, type XrayConfig } from "./sync/adapters/xray";
export {
  readLockfile,
  writeLockfile,
  parseLockfile,
  serializeLockfile,
  emptyLockfile,
  hashCaseBody,
  DEFAULT_LOCKFILE_PATH,
  type Lockfile,
  type LockEntry,
} from "./sync/lockfile";

// StoryReport public contract (consumed by UI renderers — additive-only within major)
export type {
  StoryReportSchemaVersion,
  ReportSummary,
  ReportTicket,
  ReportAttachment,
  ReportCIInfo,
  ReportCoverageSummary,
  ReportDocEntry,
  ReportDocNote,
  ReportDocTag,
  ReportDocKv,
  ReportDocCode,
  ReportDocTable,
  ReportDocLink,
  ReportDocSection,
  ReportDocMermaid,
  ReportDocScreenshot,
  ReportDocCustom,
  ReportStep,
  ReportScenario,
  ReportFeature,
  StoryReport,
} from "executable-stories-core/types/story-report";
export {
  STORY_REPORT_SCHEMA_VERSION,
  STORY_REPORT_SCHEMA_MAJOR,
} from "executable-stories-core/types/story-report";

// Options types
export type {
  CanonicalizeOptions,
  OutputFormat,
  OutputMode,
  ColocatedStyle,
  OutputRule,
  OutputConfig,
  Logger,
  WriteFile,
  MarkdownFormatterOptions,
  MarkdownRenderers,
  FormatterOptions,
  ResolvedFormatterOptions,
  SortTestCasesMode,
} from "./types/options";
export type {
  ScenarioChangeKind,
  ScenarioChangeFlags,
  ScenarioSnapshot,
  ScenarioDiff,
  RunDiffSummary,
  RunDiffResult,
  CompareFormat,
  CompareFormatterOptions,
} from "./types/compare";

// Review types (Evidence-Driven Review report)
export type {
  ReviewAudience,
  ChangeType,
  EvidenceStrength,
  ReviewBand,
  FileChangeKind,
  ChangedFile,
  ReviewContext,
  ReviewClaim,
  ChangedFileReview,
  ReviewSummary,
  ReviewResult,
  CodeDiffInput,
  CodeDiffAnnotationInput,
  CodeDiffEvidence,
  CodeDiffAnnotation,
  CodeDiffScenarioRef,
} from "./types/review";

// Canonical --es-* theme tokens (shared with executable-stories-react)
export { ES_THEME_TOKENS_CSS, ES_THEME_TOKEN_VALUES } from "executable-stories-core/theme/tokens";

// ============================================================================
// ACL Exports
// ============================================================================

export { canonicalizeRun } from "executable-stories-core/converters/acl/canonicalize";

/** @internal */
export { normalizeStatus } from "executable-stories-core/converters/acl/status";
/** @internal */
export {
  generateTestCaseId,
  generateRunId,
  slugify,
} from "executable-stories-core/converters/acl/ids";
/** @internal */
export {
  deriveStepResults,
  mergeStepResults,
} from "executable-stories-core/converters/acl/steps";
/** @internal */
export {
  resolveAttachment,
  resolveAttachments,
} from "executable-stories-core/converters/acl/attachments";

export {
  validateCanonicalRun,
  assertValidRun,
  type ValidationResult,
} from "executable-stories-core/converters/acl/validate";

// ============================================================================
// Formatter Exports
// ============================================================================

export {
  CucumberJsonFormatter,
  type CucumberJsonOptions,
} from "./formatters/cucumber-json";

export {
  StoryReportJsonFormatter,
  type StoryReportJsonOptions,
} from "./formatters/story-report-json";

export {
  ScenarioIndexJsonFormatter,
  toScenarioIndex,
  type ScenarioIndex,
  type ScenarioIndexFilters,
  type ScenarioIndexItem,
  type ScenarioIndexJsonOptions,
  type ScenarioIndexStep,
} from "./formatters/scenario-index-json";

export { AgentTextFormatter, toAgentText } from "./formatters/agent-text";

export {
  BehaviorManifestJsonFormatter,
  toBehaviorManifest,
  type BehaviorDebuggerIssue,
  type BehaviorManifest,
  type BehaviorManifestJsonOptions,
  type BehaviorSourceFile,
  type BehaviorTag,
} from "./formatters/behavior-manifest-json";

export { scenariosCoveringPaths } from "./coverage-index";

export {
  regenerateArtifacts,
  regenerateRun,
  startWatch,
  type WatchOptions,
  type WatchDeps,
  type WatchHandle,
} from "./watch";

// The old `serve` HTTP server is replaced by `astro dev` (executable-stories-astro).
// Its valuable part — the session trajectory primitive — now lives in core.
export { advanceState, initialRunState, type RunState } from "executable-stories-core";

export {
  diffStoryReports,
  classifyStatusChange,
  type BehaviorDiff,
  type BehaviorDiffEntry,
} from "./behavior-diff";

export { toStoryReport } from "executable-stories-core/converters/story-report";

// The HTML report renders via executable-stories-react (the `html` format) —
// the single report renderer. The in-package HTML string renderer was removed.
// To render a report programmatically, use `renderReportToHtml` from
// executable-stories-react/ssr.

export {
  JUnitFormatter,
  type JUnitOptions,
} from "./formatters/junit-xml";

export {
  MarkdownFormatter,
  type MarkdownOptions,
} from "./formatters/markdown";

export {
  AstroFormatter,
  type AstroFormatterOptions as AstroFormatterOpts,
  type StarlightBadge,
} from "./formatters/astro";

export {
  ConfluenceFormatter,
  type ConfluenceFormatterOptions as ConfluenceFormatterOpts,
} from "./formatters/confluence";

export {
  publishConfluencePage,
  type PublishConfluenceArgs,
  type PublishConfluenceDeps,
  type PublishConfluenceResult,
  type ConfluenceAuth,
  type FetchFn,
} from "./publishers/confluence";

export {
  publishJiraIssue,
  type PublishJiraArgs,
  type PublishJiraDeps,
  type PublishJiraResult,
  type JiraAuth,
  type JiraPublishMode,
} from "./publishers/jira";

export {
  copyMarkdownAssets,
  rewriteAssetPaths,
  type AstroAssetResult,
  type CopyMarkdownAssetsOptions,
} from "./formatters/astro-assets";

export {
  CucumberMessagesFormatter,
  type CucumberMessagesOptions,
} from "./formatters/cucumber-messages/formatter";

export {
  CucumberHtmlFormatter,
  type CucumberHtmlOptions,
} from "./formatters/cucumber-html";

export {
  RunDiffHtmlFormatter,
  type RunDiffHtmlOptions,
} from "./formatters/run-diff-html";

export {
  RunDiffMarkdownFormatter,
  type RunDiffMarkdownOptions,
} from "./formatters/run-diff-markdown";

export {
  RunDiffChangelogFormatter,
  type RunDiffChangelogOptions,
} from "./formatters/run-diff-changelog";

// ============================================================================
// NDJSON Parser (compat path: NDJSON → TestRunResult)
// ============================================================================

export { parseNdjson, parseEnvelopes } from "executable-stories-core/converters/ndjson-parser";

// ============================================================================
// Utility Exports
// ============================================================================

/** @internal */
export { readGitSha } from "./utils/git-info";
/** @internal */
export { findGitDir } from "./utils/git-info";
/** @internal */
export { readBranchName } from "./utils/git-info";
/** @internal */
export { formatDuration } from "executable-stories-core/utils/duration";
/** @internal */
export { msToNanoseconds } from "executable-stories-core/utils/duration";
/** @internal */
export { nanosecondsToMs } from "executable-stories-core/utils/duration";
/** @internal */
export { readPackageVersion } from "./utils/metadata";
/** @internal */
export { clearVersionCache } from "./utils/metadata";
export { detectCI } from "./utils/ci-detect";
export {
  tryGetActiveOtelContext,
  resolveTraceUrl,
  type OtelTraceContext,
} from "executable-stories-core/utils/otel-detect";
export { buildHtmlDocEntry, type HtmlDocOptions } from "executable-stories-core/utils/doc-builders";

// ============================================================================
// Notifier Exports
// ============================================================================

export { sendNotifications } from "./notifiers/send-notifications";
export { sendSlackNotification } from "./notifiers/slack";
export { sendTeamsNotification } from "./notifiers/teams";
export { sendWebhookNotification } from "./notifiers/webhook";
export { signBody } from "./notifiers/hmac";
export { stripAnsi } from "./notifiers/ansi-strip";
export type { NotificationSummary, NotifyCondition, GenericWebhookNotifierOptions, WebhookSignerHmac, WebhookPayload } from "./notifiers/types";

// ============================================================================
// CI Type Exports
// ============================================================================

export type { CIProvider, CIInfo as TypedCIInfo } from "executable-stories-core/types/ci";
export { toCIInfo, toRawCIInfo } from "executable-stories-core/types/ci";

// ============================================================================
// History Exports
// ============================================================================

export { loadHistory, saveHistory, updateHistory } from "./history/history-store";
export { calculateFlakiness } from "./history/flakiness";
export { detectPerformanceTrend } from "./history/performance";
export { calculateStability } from "./history/stability";
export { computeTestMetrics } from "./history/metrics";
export {
  MIN_PERF_SAMPLES,
  MIN_METRIC_SAMPLES,
  MIN_FLAKINESS_SAMPLES,
  hasSufficientHistory,
} from "./history/sample-policy";

export type {
  HistoryEntry,
  TestHistory,
  HistoryStore,
  StabilityGrade,
  FlakinessLevel,
  PerformanceTrend,
  TestMetrics,
} from "./history/types";

// ============================================================================
// List Scenarios
// ============================================================================

export { listScenarios } from "./list-scenarios";
export type { ListScenariosArgs, ListScenariosDeps } from "./list-scenarios";

export { buildCheck, renderCheck } from "./check";
export type {
  CheckArgs,
  CheckDeps,
  CheckReport,
  CheckFailure,
  CheckStep,
} from "./check";

export { buildGoal, renderGoal } from "./goal";
export type {
  GoalArgs,
  GoalDeps,
  GoalReport,
  GoalRequirementResult,
  RatchetViolation,
} from "./goal";

export { buildTriage, renderTriage } from "./triage";
export type {
  TriageArgs,
  TriageDeps,
  TriageReport,
  TriageItem,
} from "./triage";

// ============================================================================
// ReportGenerator
// ============================================================================

import { toPosix } from "./report-generator";
import type { GenerateCompareResult } from "./report-generator";

export {
  ReportGenerator,
  createReportGenerator,
  joinNameAndExt,
  normalizeFormats,
  type GenerateArgs,
  type GenerateDeps,
  type GenerateResult,
  type GenerateCompareResult,
} from "./report-generator";


export async function generateRunComparison(args: {
  baseline: TestRunResult;
  current: TestRunResult;
  formats: Array<"html" | "markdown" | "changelog">;
  outputDir?: string;
  outputName?: string;
  title?: string;
  /** Current run covers only some test files; see {@link DiffRunsOptions}. */
  partialCurrent?: boolean;
}): Promise<GenerateCompareResult> {
  const outputDir = args.outputDir ?? "reports";
  const outputName = args.outputName ?? "test-results-diff";
  const diff = diffRuns(args.baseline, args.current, {
    partialCurrent: args.partialCurrent,
  });
  const files: string[] = [];

  await fsPromises.mkdir(outputDir, { recursive: true });

  for (const format of args.formats) {
    // The changelog gets its own suffix so requesting markdown + changelog
    // together never writes both to the same file.
    const ext = format === "html" ? ".html" : format === "changelog" ? ".changelog.md" : ".md";
    const outputPath = toPosix(path.join(outputDir, `${outputName}${ext}`));
    const content =
      format === "html"
        ? new RunDiffHtmlFormatter({ title: args.title }).format(diff)
        : format === "changelog"
          ? new RunDiffChangelogFormatter().format(diff)
          : new RunDiffMarkdownFormatter({ title: args.title }).format(diff);
    await fsPromises.writeFile(outputPath, content, "utf8");
    files.push(outputPath);
  }

  return { files, diff };
}

export { diffRuns, type DiffRunsOptions } from "./compare/diff-runs";
export { createPrCommentSummary } from "./compare/pr-summary";

// Review domain + formatter (Evidence-Driven Review report)
export { buildReview, gradeEvidence, codeDiffDiagnostics } from "./review/build-review";
export {
  assembleCodeDiff,
  type CodeDiffSidecar,
  type CodeDiffSidecarAnnotation,
} from "./review/code-diff-sidecar";
export { parseUnifiedDiff, createAnchor, relocateAnchor } from "./review/diff-anchor";
export type {
  DiffAnchor,
  AnchorResolution,
  AnchorState,
  FileDiff,
  DiffHunk,
  DiffLine,
} from "./types/diff";
export {
  deriveAudience,
  deriveChangeType,
  isReviewableSource,
  isTestFile,
} from "./review/conventions";
export {
  ReviewMarkdownFormatter,
  type ReviewMarkdownOptions,
} from "./formatters/review-markdown";
export {
  ReviewHtmlFormatter,
  type ReviewHtmlOptions,
} from "./formatters/review-html";

// ============================================================================
// Convenience Functions
// ============================================================================

// Re-export adapters
export { adaptJestRun, adaptVitestRun, adaptPlaywrightRun };

// ============================================================================
// Bundler Exports
// ============================================================================

export { bundleAssets } from "./bundler/bundle-assets";
export type { BundleOptions, BundleResult } from "./bundler/bundle-assets";

// Re-export adapter types
export type {
  JestTestResult,
  JestFileResult,
  JestAggregatedResult,
  StoryFileReport,
  JestAdapterOptions,
} from "./converters/adapters/jest";
export type {
  VitestState,
  VitestSerializedError,
  VitestTestResult,
  VitestTestCase,
  VitestTestModule,
  VitestAdapterOptions,
} from "./converters/adapters/vitest";
export type {
  PlaywrightStatus,
  PlaywrightError,
  PlaywrightAttachment,
  PlaywrightTestResult,
  PlaywrightAnnotation,
  PlaywrightLocation,
  PlaywrightTestCase,
  PlaywrightAdapterOptions,
} from "./converters/adapters/playwright";

/**
 * Normalize Jest results to canonical TestRunResult.
 *
 * Combines adaptJestRun + canonicalizeRun.
 */
export function normalizeJestResults(
  jestResults: Parameters<typeof adaptJestRun>[0],
  storyReports: Parameters<typeof adaptJestRun>[1],
  adapterOptions?: Parameters<typeof adaptJestRun>[2],
  canonicalizeOptions?: CanonicalizeOptions
): TestRunResult {
  const raw: RawRun = adaptJestRun(jestResults, storyReports, adapterOptions);
  return canonicalizeRun(raw, canonicalizeOptions);
}

/**
 * Normalize Vitest results to canonical TestRunResult.
 *
 * Combines adaptVitestRun + canonicalizeRun.
 */
export function normalizeVitestResults(
  testModules: Parameters<typeof adaptVitestRun>[0],
  adapterOptions?: Parameters<typeof adaptVitestRun>[1],
  canonicalizeOptions?: CanonicalizeOptions
): TestRunResult {
  const raw: RawRun = adaptVitestRun(testModules, adapterOptions);
  return canonicalizeRun(raw, canonicalizeOptions);
}

/**
 * Normalize Playwright results to canonical TestRunResult.
 *
 * Combines adaptPlaywrightRun + canonicalizeRun.
 */
export function normalizePlaywrightResults(
  testResults: Parameters<typeof adaptPlaywrightRun>[0],
  adapterOptions?: Parameters<typeof adaptPlaywrightRun>[1],
  canonicalizeOptions?: CanonicalizeOptions
): TestRunResult {
  const raw: RawRun = adaptPlaywrightRun(testResults, adapterOptions);
  return canonicalizeRun(raw, canonicalizeOptions);
}

export type { DeploymentEntry, DeploymentLedger } from "./deploy/ledger";
export type { DeploymentStatus, EnvironmentDrift, RecordDeploymentArgs, RecordDeploymentResult } from "./deploy/deployments";
export { recordDeployment, getDeploymentStatus, getEnvironmentDrift } from "./deploy/deployments";
export { ReleaseManifestFormatter, toReleaseManifest, type ReleaseManifest } from "./formatters/release-manifest";
export {
  TraceabilityMatrixFormatter,
  TraceabilityCsvFormatter,
  toTraceabilityMatrix,
  type TraceabilityMatrix,
  type TraceabilityRequirement,
} from "./formatters/traceability-matrix";
