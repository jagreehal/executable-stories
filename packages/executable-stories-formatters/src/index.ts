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
} from "./types/options";
import type { RawRun } from "./types/raw";

import { canonicalizeRun } from "./converters/acl/index";
import { CucumberJsonFormatter } from "./formatters/cucumber-json";
import { HtmlFormatter } from "./formatters/html/index";
import { JUnitFormatter } from "./formatters/junit-xml";
import { MarkdownFormatter } from "./formatters/markdown";
import { CucumberMessagesFormatter } from "./formatters/cucumber-messages/index";
import { CucumberHtmlFormatter } from "./formatters/cucumber-html";

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
} from "./types/story";
export { STORY_META_KEY } from "./types/story";

// Canonical types (Layer 2 output - what formatters accept)
export type {
  TestStatus,
  StepResult,
  Attachment,
  TestCaseResult,
  TestCaseAttempt,
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
} from "./types/options";

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
  CucumberMessagesFormatter,
  type CucumberMessagesOptions,
} from "./formatters/cucumber-messages/index";

export {
  CucumberHtmlFormatter,
  type CucumberHtmlOptions,
} from "./formatters/cucumber-html";

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

/** Extension map for output formats */
const FORMAT_EXTENSIONS: Record<OutputFormat, string> = {
  markdown: ".md",
  html: ".html",
  "cucumber-html": ".cucumber.html",
  junit: ".junit.xml",
  "cucumber-json": ".cucumber.json",
  "cucumber-messages": ".ndjson",
};

/** Known test file extensions to strip for colocated naming */
const TEST_EXTENSIONS = [
  ".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx",
  ".test.js", ".spec.js", ".story.test.ts", ".story.spec.ts",
];

// ============================================================================
// Pure Functions for Output Routing
// ============================================================================

/**
 * Check if a pattern matches a source file using simple glob matching.
 * Supports: **, *, and literal matching.
 */
function matchesPattern(pattern: string, sourceFile: string): boolean {
  // Normalize both to forward slashes
  const normalizedPattern = pattern.replace(/\\/g, "/");
  const normalizedFile = sourceFile.replace(/\\/g, "/");

  // Convert glob pattern to regex
  const regexStr = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special regex chars except * and ?
    .replace(/\*\*/g, "{{GLOBSTAR}}")     // Protect **
    .replace(/\*/g, "[^/]*")              // * matches anything except /
    .replace(/{{GLOBSTAR}}/g, ".*");      // ** matches anything including /

  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(normalizedFile);
}

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
 * Filter test cases by include/exclude glob patterns on sourceFile.
 * Uses same glob semantics as output rules (** and *).
 */
function filterTestCasesByGlobs(
  testCases: TestCaseResult[],
  include: string[],
  exclude: string[],
  logger: Logger
): TestCaseResult[] {
  if (include.length === 0 && exclude.length === 0) return testCases;

  const filtered: TestCaseResult[] = [];
  for (const tc of testCases) {
    const sourceFile = tc.sourceFile.replace(/\\/g, "/");

    if (include.length > 0) {
      const included = include.some((p) => matchesPattern(p, sourceFile));
      if (!included) continue;
    }
    if (exclude.length > 0) {
      const excluded = exclude.some((p) => matchesPattern(p, sourceFile));
      if (excluded) continue;
    }
    filtered.push(tc);
  }

  const dropped = testCases.length - filtered.length;
  if (dropped > 0) {
    logger.warn(
      `Filtered ${dropped} test case(s) by include/exclude globs (${filtered.length} included)`
    );
  }
  return filtered;
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
  outputName: string
): string {
  const ext = FORMAT_EXTENSIONS[format];

  if (mode === "aggregated") {
    // Aggregated: single file in outputDir
    return toPosix(path.join(baseOutputDir, `${outputName}${ext}`));
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

  const fileName = `${baseName}.${outputName}${ext}`;

  if (colocatedStyle === "adjacent") {
    // Adjacent: write next to source file (ignores outputDir)
    return toPosix(path.posix.join(dirOfSource, fileName));
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
  logger: Logger
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
      outputName
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
      formats: options.formats ?? ["cucumber-json"],
      outputDir: options.outputDir ?? "reports",
      outputName: options.outputName ?? "test-results",
      output: {
        mode: options.output?.mode ?? "aggregated",
        colocatedStyle: options.output?.colocatedStyle ?? "mirrored",
        rules: options.output?.rules ?? [],
        outputName: options.output?.outputName,
      },
      cucumberJson: {
        pretty: options.cucumberJson?.pretty ?? false,
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
        syntaxHighlighting: options.html?.syntaxHighlighting ?? true,
        mermaidEnabled: options.html?.mermaidEnabled ?? true,
        markdownEnabled: options.html?.markdownEnabled ?? true,
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
        includeSourceLinks: options.markdown?.includeSourceLinks ?? true,
        customRenderers: options.markdown?.customRenderers,
      },
    };
  }

  /**
   * Generate reports for a test run.
   *
   * @param run - Canonical TestRunResult (use canonicalizeRun to create from RawRun)
   * @returns Map of output format to generated file paths
   */
  async generate(run: TestRunResult): Promise<GenerateResult> {
    const testCases = filterTestCasesByGlobs(
      run.testCases,
      this.options.include,
      this.options.exclude,
      this.deps.logger
    );
    const filteredRun: TestRunResult = { ...run, testCases };

    const results: GenerateResult = new Map();

    for (const format of this.options.formats) {
      const paths = await this.generateFormat(filteredRun, format);
      results.set(format, paths);
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
    // Group test cases by output path
    const groups = groupTestCasesByOutput(
      run.testCases,
      format,
      this.options,
      this.deps.logger
    );

    // Handle empty runs in aggregated mode - write a single empty file
    if (groups.size === 0 && this.options.output.mode === "aggregated") {
      const ext = FORMAT_EXTENSIONS[format];
      const outputPath = toPosix(path.join(this.options.outputDir, `${this.options.outputName}${ext}`));
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
          darkMode: this.options.html.darkMode,
          searchable: this.options.html.searchable,
          startCollapsed: this.options.html.startCollapsed,
          embedScreenshots: this.options.html.embedScreenshots,
          syntaxHighlighting: this.options.html.syntaxHighlighting,
          mermaidEnabled: this.options.html.mermaidEnabled,
          markdownEnabled: this.options.html.markdownEnabled,
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
          includeSourceLinks: this.options.markdown.includeSourceLinks,
          customRenderers: this.options.markdown.customRenderers,
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

// ============================================================================
// Convenience Functions
// ============================================================================

// Re-export adapters
export { adaptJestRun, adaptVitestRun, adaptPlaywrightRun };

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
