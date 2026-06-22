/**
 * @executable-stories/formatters
 *
 * Cucumber-compatible report formats (JSON, HTML, JUnit, Markdown)
 * for Jest, Vitest, and Playwright test results.
 *
 * Architecture:
 * - Layer 1: Framework Adapters (adaptJestRun, adaptVitestRun, adaptPlaywrightRun)
 * - Layer 2: Anti-Corruption Layer (canonicalizeRun)
 * - Layer 3: Formatters (CucumberJsonFormatter, HtmlFormatter, JUnitFormatter, MarkdownFormatter)
 */

import * as fs from "node:fs";
import * as path from "node:path";

import * as fsPromises from "node:fs/promises";
import type { TestRunResult, TestCaseResult } from "./types/test-result";
import type {
  FormatterOptions,
  ResolvedFormatterOptions,
  OutputFormat,
  OutputMode,
  ColocatedStyle,
  OutputRule,
  Logger,
  WriteFile,
  CanonicalizeOptions,
  SortTestCasesMode,
} from "./types/options";
import type { RawRun } from "./types/raw";
import type { RunDiffResult } from "./types/compare";

import { canonicalizeRun } from "./converters/acl/index";
import { CucumberJsonFormatter } from "./formatters/cucumber-json";
import { StoryReportJsonFormatter } from "./formatters/story-report-json";
import { ScenarioIndexJsonFormatter } from "./formatters/scenario-index-json";
import { BehaviorManifestJsonFormatter } from "./formatters/behavior-manifest-json";
import { HtmlFormatter } from "./formatters/html/index";
import { JUnitFormatter } from "./formatters/junit-xml";
import { MarkdownFormatter } from "./formatters/markdown";
import { ReleaseManifestFormatter } from "./formatters/release-manifest";
import { TraceabilityMatrixFormatter } from "./formatters/traceability-matrix";
import { CucumberMessagesFormatter } from "./formatters/cucumber-messages/index";
import { CucumberHtmlFormatter } from "./formatters/cucumber-html";
import { diffRuns } from "./compare/index";
import { RunDiffHtmlFormatter } from "./formatters/run-diff-html";
import { RunDiffMarkdownFormatter } from "./formatters/run-diff-markdown";
import { matchesPattern, selectTestCases } from "./select-test-cases";
import { bundleAssets } from "./bundler/bundle-assets";
import { AstroFormatter } from "./formatters/astro";
import { cleanTestStem } from "./utils/source-file";
import { ConfluenceFormatter } from "./formatters/confluence";
import { copyMarkdownAssets } from "./formatters/astro-assets";

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
} from "./types/story";
export { STORY_META_KEY } from "./types/story";

// OTel span types (trace waterfall rendering)
export type { OtelSpan, OtelAttributeValue } from "./types/otel";

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
  TestRunResult,
} from "./types/test-result";

// Raw types (Layer 1 - for adapter authors)
export type {
  RawStatus,
  RawAttachment,
  RawStepEvent,
  RawTestCase,
  RawCIInfo,
  RawRun,
} from "./types/raw";

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
} from "./types/story-report";
export {
  STORY_REPORT_SCHEMA_VERSION,
  STORY_REPORT_SCHEMA_MAJOR,
} from "./types/story-report";

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
} from "./types/review";

// Theme types
export type { HtmlTheme, HtmlThemeName } from "./formatters/html/themes/index";
export { resolveTheme, getAvailableThemes, getCssOnlyThemes } from "./formatters/html/themes/index";

// Canonical --es-* theme tokens (shared with executable-stories-react)
export { ES_THEME_TOKENS_CSS, ES_THEME_TOKEN_VALUES } from "./theme/tokens";

// ============================================================================
// ACL Exports
// ============================================================================

export { canonicalizeRun } from "./converters/acl/index";

/** @internal */
export { normalizeStatus } from "./converters/acl/index";
/** @internal */
export { generateTestCaseId } from "./converters/acl/index";
/** @internal */
export { generateRunId } from "./converters/acl/index";
/** @internal */
export { slugify } from "./converters/acl/index";
/** @internal */
export { deriveStepResults } from "./converters/acl/index";
/** @internal */
export { mergeStepResults } from "./converters/acl/index";
/** @internal */
export { resolveAttachment } from "./converters/acl/index";
/** @internal */
export { resolveAttachments } from "./converters/acl/index";

export {
  validateCanonicalRun,
  assertValidRun,
  type ValidationResult,
} from "./converters/acl/validate";

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

export {
  startServe,
  advanceState,
  computeDeltas,
  renderDeltaStrip,
  injectLiveBits,
  type ServeOptions,
  type ServeDeps,
  type ServeHandle,
  type RunState,
  type RunDeltas,
} from "./serve";

export {
  diffStoryReports,
  classifyStatusChange,
  type BehaviorDiff,
  type BehaviorDiffEntry,
} from "./behavior-diff";

export { toStoryReport } from "./converters/story-report";

export {
  HtmlFormatter,
  type HtmlOptions,
} from "./formatters/html/index";

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
} from "./formatters/cucumber-messages/index";

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

// ============================================================================
// NDJSON Parser (compat path: NDJSON → TestRunResult)
// ============================================================================

export { parseNdjson, parseEnvelopes } from "./converters/ndjson-parser";

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
export { formatDuration } from "./utils/duration";
/** @internal */
export { msToNanoseconds } from "./utils/duration";
/** @internal */
export { nanosecondsToMs } from "./utils/duration";
/** @internal */
export { readPackageVersion } from "./utils/metadata";
/** @internal */
export { clearVersionCache } from "./utils/metadata";
export { detectCI } from "./utils/ci-detect";
export {
  tryGetActiveOtelContext,
  resolveTraceUrl,
  type OtelTraceContext,
} from "./utils/otel-detect";
export { buildHtmlDocEntry, type HtmlDocOptions } from "./utils/doc-builders";

// ============================================================================
// Notifier Exports
// ============================================================================

export { sendNotifications } from "./notifiers/index";
export { sendSlackNotification } from "./notifiers/slack";
export { sendTeamsNotification } from "./notifiers/teams";
export { sendWebhookNotification } from "./notifiers/webhook";
export { signBody } from "./notifiers/hmac";
export { stripAnsi } from "./notifiers/ansi-strip";
export type { NotificationSummary, NotifyCondition, GenericWebhookNotifierOptions, WebhookSignerHmac, WebhookPayload } from "./notifiers/types";

// ============================================================================
// CI Type Exports
// ============================================================================

export type { CIProvider, CIInfo as TypedCIInfo } from "./types/ci";
export { toCIInfo, toRawCIInfo } from "./types/ci";

// ============================================================================
// History Exports
// ============================================================================

export {
  loadHistory,
  saveHistory,
  updateHistory,
  calculateFlakiness,
  detectPerformanceTrend,
  calculateStability,
  computeTestMetrics,
  MIN_PERF_SAMPLES,
  MIN_METRIC_SAMPLES,
  MIN_FLAKINESS_SAMPLES,
  hasSufficientHistory,
} from "./history/index";

export type {
  HistoryEntry,
  TestHistory,
  HistoryStore,
  StabilityGrade,
  FlakinessLevel,
  PerformanceTrend,
  TestMetrics,
} from "./history/index";

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
// ReportGenerator Types (fn(args, deps) pattern)
// ============================================================================

/** Arguments for generate function */
export interface GenerateArgs {
  /** Canonical test run result */
  run: TestRunResult;
  /** Optional options override */
  options?: FormatterOptions;
}

/** Dependencies for generate function (injectable for testing) */
export interface GenerateDeps {
  /** Logger for warnings */
  logger: Logger;
  /** File writer function */
  writeFile: WriteFile;
}

/** Result of generate function: Map of format to array of file paths */
export type GenerateResult = Map<OutputFormat, string[]>;

export interface GenerateCompareResult {
  files: string[];
  diff: RunDiffResult;
}

/** Extension map for output formats */
const FORMAT_EXTENSIONS: Record<OutputFormat, string> = {
  astro: ".md",
  "behavior-manifest-json": ".behavior-manifest.json",
  markdown: ".md",
  "release-manifest": ".release-manifest.md",
  "traceability-matrix": ".traceability-matrix.md",
  html: ".html",
  "cucumber-html": ".cucumber.html",
  junit: ".junit.xml",
  "cucumber-json": ".cucumber.json",
  "cucumber-messages": ".ndjson",
  confluence: ".adf.json",
  "scenario-index-json": ".scenarios-index.json",
  "story-report-json": ".story-report.json",
};

/**
 * Join an output name with a format extension, collapsing a stutter when the
 * chosen name already carries the format's tag. With the default name "index",
 * `story-report-json` writes `index.story-report.json`; but if the caller names
 * the file `story-report`, this yields `story-report.json`, not
 * `story-report.story-report.json`.
 */
export function joinNameAndExt(name: string, ext: string): string {
  const stutter = `.${name}.`;
  return ext.startsWith(stutter) ? `${name}.${ext.slice(stutter.length)}` : `${name}${ext}`;
}

/** Known test file extensions to strip for colocated naming */
const TEST_EXTENSIONS = [
  ".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx",
  ".test.js", ".spec.js", ".story.test.ts", ".story.spec.ts",
];

// ============================================================================
// Pure Functions for Output Routing
// ============================================================================

/**
 * Find the first matching rule for a source file.
 */
function findMatchingRule(
  sourceFile: string,
  rules: OutputRule[]
): OutputRule | undefined {
  for (const rule of rules) {
    if (matchesPattern(rule.match, sourceFile)) {
      return rule;
    }
  }
  return undefined;
}

/**
 * Normalize path to posix format (forward slashes).
 */
function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Compute output path for a test case based on mode and settings.
 */
function computeOutputPath(
  sourceFile: string,
  format: OutputFormat,
  mode: OutputMode,
  colocatedStyle: ColocatedStyle,
  baseOutputDir: string,
  outputName: string,
  outputNameSuffix?: string
): string {
  const ext = FORMAT_EXTENSIONS[format];
  const effectiveName = outputName + (outputNameSuffix ?? "");

  if (mode === "aggregated") {
    // Aggregated: single file in outputDir
    return toPosix(path.join(baseOutputDir, joinNameAndExt(effectiveName, ext)));
  }

  // Colocated mode - normalize source file to posix first
  const normalizedSource = toPosix(sourceFile);
  const dirOfSource = path.posix.dirname(normalizedSource);
  let baseName = path.posix.basename(normalizedSource);

  // Strip test extension
  for (const testExt of TEST_EXTENSIONS) {
    if (baseName.endsWith(testExt)) {
      baseName = baseName.slice(0, -testExt.length);
      break;
    }
  }

  const fileName = `${baseName}.${effectiveName}${ext}`;

  if (colocatedStyle === "adjacent") {
    // Adjacent: write next to source file (ignores outputDir)
    return toPosix(path.posix.join(dirOfSource, fileName));
  }

  if (colocatedStyle === "flat") {
    // Flat: one cleanly-named page per file directly under outputDir, for a
    // browsable docs nav with tidy URLs (e.g. /stories/convert-currency/).
    return toPosix(path.posix.join(baseOutputDir, `${cleanTestStem(normalizedSource)}${ext}`));
  }

  // Mirrored: preserve directory structure under outputDir
  return toPosix(path.posix.join(baseOutputDir, dirOfSource, fileName));
}

/**
 * Group test cases by their computed output path.
 */
function groupTestCasesByOutput(
  testCases: TestCaseResult[],
  format: OutputFormat,
  options: ResolvedFormatterOptions,
  logger: Logger,
  outputNameSuffix?: string
): Map<string, TestCaseResult[]> {
  const groups = new Map<string, TestCaseResult[]>();
  const rules = options.output.rules;
  const defaultMode = options.output.mode;
  const defaultColocatedStyle = options.output.colocatedStyle;
  const defaultFormats = options.formats;
  const defaultOutputDir = options.outputDir;
  const defaultOutputName = options.outputName;

  for (const tc of testCases) {
    const sourceFile = tc.sourceFile;

    // Check if colocated mode but missing sourceFile
    if (defaultMode === "colocated" && sourceFile === "unknown") {
      logger.warn(
        `Test case "${tc.story.scenario}" missing sourceFile, falling back to aggregated`
      );
    }

    // Find matching rule
    const rule = findMatchingRule(sourceFile, rules);

    // Determine effective settings (first match wins, fall back to defaults)
    const mode = rule?.mode ?? defaultMode;
    const colocatedStyle = rule?.colocatedStyle ?? defaultColocatedStyle;
    const formats = rule?.formats ?? defaultFormats;
    const outputDir = rule?.outputDir ?? defaultOutputDir;
    const outputName = rule?.outputName ?? options.output.outputName ?? defaultOutputName;

    // Warn if rule sets both adjacent style and outputDir
    if (
      rule &&
      rule.colocatedStyle === "adjacent" &&
      rule.outputDir !== undefined
    ) {
      logger.warn(
        `Rule for "${rule.match}" sets both colocatedStyle: "adjacent" and outputDir. outputDir will be ignored for adjacent mode.`
      );
    }

    // Skip if format not in effective formats
    if (!formats.includes(format)) {
      continue;
    }

    // Handle missing sourceFile in colocated mode
    const effectiveMode =
      mode === "colocated" && sourceFile === "unknown" ? "aggregated" : mode;

    const outputPath = computeOutputPath(
      sourceFile,
      format,
      effectiveMode,
      colocatedStyle,
      outputDir,
      outputName,
      outputNameSuffix
    );

    const existing = groups.get(outputPath);
    if (existing) {
      existing.push(tc);
    } else {
      groups.set(outputPath, [tc]);
    }
  }

  return groups;
}

// ============================================================================
// ReportGenerator
// ============================================================================

/**
 * High-level report generator that combines multiple formatters.
 *
 * Accepts ONLY canonical TestRunResult - use adapters + canonicalizeRun first.
 *
 * Supports output routing:
 * - Aggregated: All test cases in a single file
 * - Colocated mirrored: Files mirrored under outputDir preserving directory structure
 * - Colocated adjacent: Files written next to source files
 * - Rule-based: Different routing based on source file patterns
 */
export class ReportGenerator {
  private options: ResolvedFormatterOptions;
  private deps: GenerateDeps;

  constructor(options: FormatterOptions = {}, deps?: Partial<GenerateDeps>) {
    this.options = this.resolveOptions(options);
    this.deps = {
      logger: deps?.logger ?? console,
      writeFile: deps?.writeFile ?? ((p, c) => fsPromises.writeFile(p, c, "utf8")),
    };
  }

  /**
   * Resolve options with defaults.
   */
  private resolveOptions(options: FormatterOptions): ResolvedFormatterOptions {
    return {
      include: options.include ?? [],
      exclude: options.exclude ?? [],
      includeTags: options.includeTags ?? [],
      excludeTags: options.excludeTags ?? [],
      formats: options.formats ?? ["html"],
      outputDir: options.outputDir ?? "reports",
      outputName: options.outputName ?? "index",
      outputNameTimestamp: options.outputNameTimestamp ?? false,
      sortTestCases: options.sortTestCases ?? "none",
      output: {
        mode: options.output?.mode ?? "aggregated",
        colocatedStyle: options.output?.colocatedStyle ?? "mirrored",
        rules: options.output?.rules ?? [],
        outputName: options.output?.outputName,
      },
      cucumberJson: {
        pretty: options.cucumberJson?.pretty ?? false,
      },
      storyReportJson: {
        pretty: options.storyReportJson?.pretty ?? true,
      },
      scenarioIndexJson: {
        pretty: options.scenarioIndexJson?.pretty ?? true,
      },
      behaviorManifestJson: {
        pretty: options.behaviorManifestJson?.pretty ?? true,
      },
      cucumberMessages: {
        uriStrategy: options.cucumberMessages?.uriStrategy ?? "sourceFile",
        includeSynthetics: options.cucumberMessages?.includeSynthetics ?? true,
        idSalt: options.cucumberMessages?.idSalt ?? "",
        meta: options.cucumberMessages?.meta,
      },
      html: {
        title: options.html?.title ?? "Test Results",
        darkMode: options.html?.darkMode ?? true,
        searchable: options.html?.searchable ?? true,
        startCollapsed: options.html?.startCollapsed ?? false,
        embedScreenshots: options.html?.embedScreenshots ?? true,
        // Under "copy" asset mode local html files become hashed assets with
        // an iframe src instead of being inlined into the report.
        embedHtmlFiles: options.html?.embedHtmlFiles ?? (options.assetMode ?? "none") !== "copy",
        syntaxHighlighting: options.html?.syntaxHighlighting ?? true,
        mermaidEnabled: options.html?.mermaidEnabled ?? true,
        markdownEnabled: options.html?.markdownEnabled ?? true,
        permalinkBaseUrl: options.html?.permalinkBaseUrl,
        ticketUrlTemplate: options.html?.ticketUrlTemplate,
        theme: options.html?.theme ?? "default",
        tocEnabled: options.html?.tocEnabled ?? true,
        themePickerEnabled: options.html?.themePickerEnabled ?? false,
      },
      junit: {
        suiteName: options.junit?.suiteName ?? "Test Suite",
        includeOutput: options.junit?.includeOutput ?? true,
      },
      markdown: {
        title: options.markdown?.title ?? "User Stories",
        includeStatusIcons: options.markdown?.includeStatusIcons ?? true,
        includeMetadata: options.markdown?.includeMetadata ?? true,
        includeErrors: options.markdown?.includeErrors ?? true,
        scenarioHeadingLevel: options.markdown?.scenarioHeadingLevel ?? 3,
        stepStyle: options.markdown?.stepStyle ?? "bullets",
        groupBy: options.markdown?.groupBy ?? "file",
        sortScenarios: options.markdown?.sortScenarios ?? "source",
        suiteSeparator: options.markdown?.suiteSeparator ?? " - ",
        includeFrontMatter: options.markdown?.includeFrontMatter ?? false,
        includeSummaryTable: options.markdown?.includeSummaryTable ?? false,
        permalinkBaseUrl: options.markdown?.permalinkBaseUrl,
        ticketUrlTemplate: options.markdown?.ticketUrlTemplate,
        traceUrlTemplate: options.markdown?.traceUrlTemplate,
        includeSourceLinks: options.markdown?.includeSourceLinks ?? true,
        customRenderers: options.markdown?.customRenderers,
      },
      confluence: {
        title: options.confluence?.title ?? "User Stories",
        includeStatusIcons: options.confluence?.includeStatusIcons ?? true,
        includeMetadata: options.confluence?.includeMetadata ?? true,
        includeSummaryTable: options.confluence?.includeSummaryTable ?? true,
        includeErrors: options.confluence?.includeErrors ?? true,
        scenarioHeadingLevel: options.confluence?.scenarioHeadingLevel ?? 3,
        groupBy: options.confluence?.groupBy ?? "file",
        sortScenarios: options.confluence?.sortScenarios ?? "source",
        pretty: options.confluence?.pretty ?? true,
        permalinkBaseUrl: options.confluence?.permalinkBaseUrl,
        ticketUrlTemplate: options.confluence?.ticketUrlTemplate,
      },
      astro: {
        assetsDir: options.astro?.assetsDir ?? "public/stories/assets",
        assetsBaseUrl: options.astro?.assetsBaseUrl ?? "/stories/assets",
        markdown: {
          title: options.astro?.markdown?.title ?? "User Stories",
          includeStatusIcons: options.astro?.markdown?.includeStatusIcons ?? true,
          includeErrors: options.astro?.markdown?.includeErrors ?? true,
          scenarioHeadingLevel: options.astro?.markdown?.scenarioHeadingLevel ?? 3,
          groupBy: options.astro?.markdown?.groupBy ?? "file",
          sortScenarios: options.astro?.markdown?.sortScenarios ?? "source",
          suiteSeparator: options.astro?.markdown?.suiteSeparator ?? " - ",
          includeSourceLinks: options.astro?.markdown?.includeSourceLinks ?? true,
          permalinkBaseUrl: options.astro?.markdown?.permalinkBaseUrl,
          ticketUrlTemplate: options.astro?.markdown?.ticketUrlTemplate,
          traceUrlTemplate: options.astro?.markdown?.traceUrlTemplate,
          customRenderers: options.astro?.markdown?.customRenderers,
          scenarioAnchor: options.astro?.markdown?.scenarioAnchor,
          scenarioBadge: options.astro?.markdown?.scenarioBadge,
          scenarioNoteLink: options.astro?.markdown?.scenarioNoteLink,
        },
      },
      assetMode: options.assetMode ?? "none",
      allowMissingAssets: options.allowMissingAssets ?? false,
    };
  }

  /**
   * Generate reports for a test run.
   *
   * @param run - Canonical TestRunResult (use canonicalizeRun to create from RawRun)
   * @returns Map of output format to generated file paths
   */
  async generate(run: TestRunResult): Promise<GenerateResult> {
    const testCases = selectTestCases(
      {
        testCases: run.testCases,
        include: this.options.include,
        exclude: this.options.exclude,
        includeTags: this.options.includeTags,
        excludeTags: this.options.excludeTags,
        sortTestCases: this.options.sortTestCases,
      },
      { logger: this.deps.logger }
    );

    const filteredRun: TestRunResult = { ...run, testCases };

    const results: GenerateResult = new Map();

    for (const format of this.options.formats) {
      const paths = await this.generateFormat(filteredRun, format);
      results.set(format, paths);
    }

    if (this.options.assetMode === "copy") {
      const htmlPaths = results.get("html");
      if (htmlPaths) {
        for (const htmlPath of htmlPaths) {
          bundleAssets(htmlPath, {
            allowMissing: this.options.allowMissingAssets,
          });
        }
      }

      const astroPaths = results.get("astro");
      if (astroPaths) {
        for (const mdPath of astroPaths) {
          const content = await fsPromises.readFile(mdPath, "utf8");
          const mdDir = path.dirname(mdPath);
          // assetsDir is resolved from CWD (same as outputDir), not relative to outputDir
          const assetsDir = path.resolve(this.options.astro.assetsDir);
          const result = copyMarkdownAssets({
            markdown: content,
            markdownDir: mdDir,
            assetsDir,
            assetsBaseUrl: this.options.astro.assetsBaseUrl,
            allowMissing: this.options.allowMissingAssets,
          });
          if (result.copiedCount > 0 || result.missingCount > 0) {
            await this.deps.writeFile(mdPath, result.markdown);
          }
        }
      }
    }

    return results;
  }

  /**
   * Generate reports for a single format.
   */
  private async generateFormat(
    run: TestRunResult,
    format: OutputFormat
  ): Promise<string[]> {
    const outputNameSuffix = this.options.outputNameTimestamp
      ? `-${Math.floor(run.startedAtMs / 1000)}`
      : undefined;

    // Group test cases by output path
    const groups = groupTestCasesByOutput(
      run.testCases,
      format,
      this.options,
      this.deps.logger,
      outputNameSuffix
    );

    // Handle empty runs in aggregated mode - write a single empty file
    if (groups.size === 0 && this.options.output.mode === "aggregated") {
      const ext = FORMAT_EXTENSIONS[format];
      const effectiveName = this.options.outputName + (outputNameSuffix ?? "");
      const outputPath = toPosix(path.join(this.options.outputDir, joinNameAndExt(effectiveName, ext)));
      const content = await this.formatContent(run, format);
      const dir = path.dirname(outputPath);
      await fsPromises.mkdir(dir, { recursive: true });
      await this.deps.writeFile(outputPath, content);
      return [outputPath];
    }

    const writtenPaths: string[] = [];

    for (const [outputPath, testCases] of groups) {
      // Create a run with just these test cases
      const groupRun: TestRunResult = {
        ...run,
        testCases,
      };

      // Format content
      const content = await this.formatContent(groupRun, format);

      // Ensure directory exists
      const dir = path.dirname(outputPath);
      await fsPromises.mkdir(dir, { recursive: true });

      // Write file
      await this.deps.writeFile(outputPath, content);
      writtenPaths.push(outputPath);
    }

    return writtenPaths;
  }

  /**
   * Format content for a specific format.
   */
  private formatContent(run: TestRunResult, format: OutputFormat): string | Promise<string> {
    switch (format) {
      case "cucumber-json": {
        const formatter = new CucumberJsonFormatter({
          pretty: this.options.cucumberJson.pretty,
        });
        return formatter.formatToString(run);
      }

      case "html": {
        const formatter = new HtmlFormatter({
          title: this.options.html.title,
          theme: this.options.html.theme,
          darkMode: this.options.html.darkMode,
          searchable: this.options.html.searchable,
          startCollapsed: this.options.html.startCollapsed,
          embedScreenshots: this.options.html.embedScreenshots,
          embedHtmlFiles: this.options.html.embedHtmlFiles,
          syntaxHighlighting: this.options.html.syntaxHighlighting,
          mermaidEnabled: this.options.html.mermaidEnabled,
          markdownEnabled: this.options.html.markdownEnabled,
          permalinkBaseUrl: this.options.html.permalinkBaseUrl,
          ticketUrlTemplate: this.options.html.ticketUrlTemplate,
          tocEnabled: this.options.html.tocEnabled,
          themePickerEnabled: this.options.html.themePickerEnabled,
        });
        return formatter.format(run);
      }

      case "cucumber-html": {
        const formatter = new CucumberHtmlFormatter({
          messages: {
            uriStrategy: this.options.cucumberMessages.uriStrategy,
            includeSynthetics: this.options.cucumberMessages.includeSynthetics,
            idSalt: this.options.cucumberMessages.idSalt,
            meta: this.options.cucumberMessages.meta,
          },
        });
        return formatter.formatToString(run);
      }

      case "junit": {
        const formatter = new JUnitFormatter({
          suiteName: this.options.junit.suiteName,
          includeOutput: this.options.junit.includeOutput,
        });
        return formatter.format(run);
      }

      case "cucumber-messages": {
        const formatter = new CucumberMessagesFormatter({
          uriStrategy: this.options.cucumberMessages.uriStrategy,
          includeSynthetics: this.options.cucumberMessages.includeSynthetics,
          idSalt: this.options.cucumberMessages.idSalt,
          meta: this.options.cucumberMessages.meta,
        });
        return formatter.formatToString(run);
      }

      case "astro": {
        const formatter = new AstroFormatter({
          assetsBaseUrl: this.options.astro.assetsBaseUrl,
          // Colocated = one page per file, so title each by its own suite/file.
          perFileTitle: this.options.output.mode === "colocated",
          markdown: this.options.astro.markdown,
        });
        return formatter.format(run);
      }

      case "confluence": {
        const formatter = new ConfluenceFormatter({
          title: this.options.confluence.title,
          includeStatusIcons: this.options.confluence.includeStatusIcons,
          includeMetadata: this.options.confluence.includeMetadata,
          includeSummaryTable: this.options.confluence.includeSummaryTable,
          includeErrors: this.options.confluence.includeErrors,
          scenarioHeadingLevel: this.options.confluence.scenarioHeadingLevel,
          groupBy: this.options.confluence.groupBy,
          sortScenarios: this.options.confluence.sortScenarios,
          pretty: this.options.confluence.pretty,
          permalinkBaseUrl: this.options.confluence.permalinkBaseUrl,
          ticketUrlTemplate: this.options.confluence.ticketUrlTemplate,
        });
        return formatter.format(run);
      }

      case "markdown": {
        const formatter = new MarkdownFormatter({
          title: this.options.markdown.title,
          includeStatusIcons: this.options.markdown.includeStatusIcons,
          includeMetadata: this.options.markdown.includeMetadata,
          includeErrors: this.options.markdown.includeErrors,
          scenarioHeadingLevel: this.options.markdown.scenarioHeadingLevel,
          stepStyle: this.options.markdown.stepStyle,
          groupBy: this.options.markdown.groupBy,
          sortScenarios: this.options.markdown.sortScenarios,
          suiteSeparator: this.options.markdown.suiteSeparator,
          includeFrontMatter: this.options.markdown.includeFrontMatter,
          includeSummaryTable: this.options.markdown.includeSummaryTable,
          permalinkBaseUrl: this.options.markdown.permalinkBaseUrl,
          ticketUrlTemplate: this.options.markdown.ticketUrlTemplate,
          traceUrlTemplate: this.options.markdown.traceUrlTemplate,
          includeSourceLinks: this.options.markdown.includeSourceLinks,
          customRenderers: this.options.markdown.customRenderers,
        });
        return formatter.format(run);
      }

      case "release-manifest": {
        const formatter = new ReleaseManifestFormatter();
        return formatter.format(run);
      }

      case "traceability-matrix": {
        const formatter = new TraceabilityMatrixFormatter();
        return formatter.format(run);
      }

      case "story-report-json": {
        const formatter = new StoryReportJsonFormatter({
          pretty: this.options.storyReportJson.pretty,
        });
        return formatter.format(run);
      }

      case "scenario-index-json": {
        const formatter = new ScenarioIndexJsonFormatter({
          pretty: this.options.scenarioIndexJson.pretty,
        });
        return formatter.format(run);
      }

      case "behavior-manifest-json": {
        const formatter = new BehaviorManifestJsonFormatter({
          pretty: this.options.behaviorManifestJson.pretty,
        });
        return formatter.format(run);
      }

      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }
}

/**
 * Factory function to create a ReportGenerator with dependency injection.
 *
 * Useful for testing and custom configurations.
 */
export function createReportGenerator(
  options?: FormatterOptions,
  deps?: Partial<GenerateDeps>
): ReportGenerator {
  return new ReportGenerator(options, deps);
}

export async function generateRunComparison(args: {
  baseline: TestRunResult;
  current: TestRunResult;
  formats: Array<"html" | "markdown">;
  outputDir?: string;
  outputName?: string;
  title?: string;
}): Promise<GenerateCompareResult> {
  const outputDir = args.outputDir ?? "reports";
  const outputName = args.outputName ?? "test-results-diff";
  const diff = diffRuns(args.baseline, args.current);
  const files: string[] = [];

  await fsPromises.mkdir(outputDir, { recursive: true });

  for (const format of args.formats) {
    const ext = format === "html" ? ".html" : ".md";
    const outputPath = toPosix(path.join(outputDir, `${outputName}${ext}`));
    const content =
      format === "html"
        ? new RunDiffHtmlFormatter({ title: args.title }).format(diff)
        : new RunDiffMarkdownFormatter({ title: args.title }).format(diff);
    await fsPromises.writeFile(outputPath, content, "utf8");
    files.push(outputPath);
  }

  return { files, diff };
}

export { diffRuns } from "./compare/index";
export { createPrCommentSummary } from "./compare/index";

// Review domain + formatter (Evidence-Driven Review report)
export { buildReview, gradeEvidence } from "./review/build-review";
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
} from "./converters/adapters/index";

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
export type { DeploymentStatus, EnvironmentDrift, RecordDeploymentArgs, RecordDeploymentResult } from "./deploy/index";
export { recordDeployment, getDeploymentStatus, getEnvironmentDrift } from "./deploy/index";
export { ReleaseManifestFormatter, toReleaseManifest, type ReleaseManifest } from "./formatters/release-manifest";
export {
  TraceabilityMatrixFormatter,
  toTraceabilityMatrix,
  type TraceabilityMatrix,
  type TraceabilityRequirement,
} from "./formatters/traceability-matrix";
