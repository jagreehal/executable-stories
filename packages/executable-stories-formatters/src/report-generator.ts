/**
 * ReportGenerator — turns a canonical TestRunResult into report files.
 *
 * Its own module rather than part of the package barrel: `watch.ts` needs the
 * generator, and reaching for it through `./index` would pull every formatter
 * and the React SSR path into that module's graph.
 */

import * as path from "node:path";
import * as fsPromises from "node:fs/promises";
import { toStoryReportWithIndex } from "executable-stories-core/converters/story-report";
import type { ScenarioRunEvent } from "executable-stories-react/ssr";
import type { TestRunResult, TestCaseResult } from "executable-stories-core/types/test-result";
import type { FormatterOptions, ResolvedFormatterOptions, OutputFormat, FormatInput, OutputMode, ColocatedStyle, OutputRule, Logger, WriteFile } from "./types/options";
import type { RunDiffResult } from "./types/compare";
import { reactReportCss, reactIslandScript } from "./generated/react-assets";
import { CucumberJsonFormatter } from "./formatters/cucumber-json";
import { StoryReportJsonFormatter } from "./formatters/story-report-json";
import { ScenarioIndexJsonFormatter } from "./formatters/scenario-index-json";
import { BehaviorManifestJsonFormatter } from "./formatters/behavior-manifest-json";
import { AgentTextFormatter } from "./formatters/agent-text";
import { JUnitFormatter } from "./formatters/junit-xml";
import { MarkdownFormatter } from "./formatters/markdown";
import { ReleaseManifestFormatter } from "./formatters/release-manifest";
import { TraceabilityCsvFormatter, TraceabilityMatrixFormatter } from "./formatters/traceability-matrix";
import { CucumberMessagesFormatter } from "./formatters/cucumber-messages/formatter";
import { CucumberHtmlFormatter } from "./formatters/cucumber-html";
import { buildIndexEntries, renderColocatedIndex } from "./colocated-index";
import { matchesPattern, selectTestCases } from "./select-test-cases";
import { AstroFormatter } from "./formatters/astro";
import { cleanTestStem } from "executable-stories-core/utils/source-file";
import { ConfluenceFormatter } from "./formatters/confluence";
import { copyMarkdownAssets } from "./formatters/astro-assets";
import { bundleAssets } from "./bundler/bundle-assets";

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
  "agent-text": ".agent.txt",
  "astro-markdown": ".md",
  "behavior-manifest-json": ".behavior-manifest.json",
  markdown: ".md",
  "release-manifest": ".release-manifest.md",
  "traceability-matrix": ".traceability-matrix.md",
  "traceability-csv": ".traceability.csv",
  html: ".html",
  "cucumber-html": ".cucumber.html",
  junit: ".junit.xml",
  "cucumber-json": ".cucumber.json",
  "cucumber-messages": ".ndjson",
  confluence: ".adf.json",
  "scenario-index-json": ".scenario-index.json",
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
 * Effective output mode for a source file: the matching rule's mode, else the
 * global default. Mirrors the resolution in groupTestCasesByOutput, including
 * the fallback where a colocated file with no known source aggregates instead.
 */
function effectiveOutputMode(
  sourceFile: string,
  options: ResolvedFormatterOptions
): OutputMode {
  const rule = findMatchingRule(sourceFile, options.output.rules);
  const mode = rule?.mode ?? options.output.mode;
  return mode === "colocated" && sourceFile === "unknown" ? "aggregated" : mode;
}

/**
 * Normalize path to posix format (forward slashes).
 */
export function toPosix(p: string): string {
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
    const formats = normalizeFormats(rule?.formats ?? defaultFormats);
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

let astroAliasWarned = false;

/**
 * Normalise input formats to canonical {@link OutputFormat}s. Accepts the
 * deprecated `"astro"` alias (renamed to `"astro-markdown"`) and warns once per
 * process — so programmatic/config callers passing `"astro"` keep working
 * instead of throwing, matching the CLI's deprecation behaviour.
 */
export function normalizeFormats(formats: ReadonlyArray<FormatInput>): OutputFormat[] {
  return formats.map((f) => {
    if (f === "astro") {
      if (!astroAliasWarned) {
        astroAliasWarned = true;
        console.warn(
          "⚠ The 'astro' output format was renamed to 'astro-markdown'. '\"astro\"' still works but " +
            "will be removed in a future major; use 'astro-markdown'.",
        );
      }
      return "astro-markdown";
    }
    return f;
  });
}

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
      formats: normalizeFormats(options.formats ?? ["html"]),
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
        syntaxHighlighting: options.html?.syntaxHighlighting ?? true,
        mermaidEnabled: options.html?.mermaidEnabled ?? true,
        staleAfterDays: options.html?.staleAfterDays ?? 7,
      },
      historyStore: options.historyStore,
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

    // Colocated output writes one HTML report per source file, which leaves a
    // directory of files with no front door — someone handed the folder has
    // nothing to open. Write an index listing them (failures first). An
    // aggregated group is a single file that IS its own entry point, so only
    // colocated groups are indexed. A per-rule colocated mode counts too, even
    // when the global mode is aggregated (writeColocatedIndex filters to the
    // colocated groups and returns undefined when there are none).
    const htmlPaths = results.get("html") ?? [];
    if (this.hasColocatedOutput() && htmlPaths.length > 0) {
      const indexPath = await this.writeColocatedIndex(filteredRun, htmlPaths);
      if (indexPath) results.set("html", [...htmlPaths, indexPath]);
    }

    if (this.options.assetMode === "copy") {
      // The html report references screenshots/videos by path — DocScreenshot
      // and DocVideo emit <img>/<video src=...> rather than inlining bytes — so
      // a moved or hosted report would 404 its media. Bundle them: copy
      // referenced local media into assets/ beside the report and rewrite the
      // paths in both the static markup and the embedded report JSON the
      // interactive island re-renders from.
      const htmlPaths = results.get("html");
      if (htmlPaths) {
        for (const htmlPath of htmlPaths) {
          bundleAssets(htmlPath, { allowMissing: this.options.allowMissingAssets });
        }
      }

      const astroPaths = results.get("astro-markdown");
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
   * Whether any output is colocated — the global mode, or any per-rule mode.
   * A colocated rule under a global aggregated mode still writes per-file
   * reports that need an index.
   */
  private hasColocatedOutput(): boolean {
    return (
      this.options.output.mode === "colocated" ||
      this.options.output.rules.some((rule) => rule.mode === "colocated")
    );
  }

  /**
   * Write the entry-point page for a colocated HTML report tree. `htmlPaths` is
   * every HTML report already written this run. Returns the path written, or
   * undefined when there is nothing to index or the index would clobber a report
   * already at `index.html` — a colocated source file that produces it, or, in
   * mixed mode, the global aggregate (whose default output name is also index).
   */
  private async writeColocatedIndex(
    run: TestRunResult,
    htmlPaths: string[]
  ): Promise<string | undefined> {
    const outputNameSuffix = this.options.outputNameTimestamp
      ? `-${Math.floor(run.startedAtMs / 1000)}`
      : undefined;
    // Recompute the same grouping generateFormat used so the index links
    // exactly the files that were written (deterministic, so this cannot drift).
    const groups = groupTestCasesByOutput(
      run.testCases,
      "html",
      this.options,
      this.deps.logger,
      outputNameSuffix,
    );
    const bySourceFile = new Map<string, string>();
    for (const [outputPath, testCases] of groups) {
      const sourceFile = testCases[0]?.sourceFile;
      if (!sourceFile) continue;
      // Index colocated groups only. An aggregated group covers many source
      // files in one report — it is its own front door, and mapping it to
      // testCases[0].sourceFile would list it as if it belonged to that one
      // file while hiding the rest.
      if (effectiveOutputMode(sourceFile, this.options) !== "colocated") continue;
      bySourceFile.set(sourceFile, outputPath);
    }
    if (bySourceFile.size === 0) return undefined;

    const indexPath = toPosix(path.join(this.options.outputDir, "index.html"));
    if (htmlPaths.some((p) => toPosix(p) === indexPath)) {
      this.deps.logger.warn?.(
        `Skipping colocated index: a report already occupies ${indexPath}.`,
      );
      return undefined;
    }

    const entries = buildIndexEntries(run, bySourceFile, path.dirname(indexPath));
    const html = renderColocatedIndex(entries, this.options.html.title);
    await fsPromises.mkdir(path.dirname(indexPath), { recursive: true });
    await this.deps.writeFile(indexPath, html);
    return indexPath;
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
        // The HTML report renders via executable-stories-react (the single
        // report renderer). Lazy import keeps React + executable-stories-react
        // out of the eager import graph (and the Bun single binary) unless the
        // html format is requested.
        return this.formatHtmlReact(run);
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

      case "astro-markdown": {
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

      case "traceability-csv": {
        const formatter = new TraceabilityCsvFormatter();
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

      case "agent-text": {
        const formatter = new AgentTextFormatter();
        return formatter.format(run);
      }

      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  /**
   * Render a standalone HTML report via the shared React component tree
   * (executable-stories-react). This is the same renderer the Astro docs site
   * uses, so the two outputs cannot drift. Imported lazily so React stays out
   * of the eager bundle unless this format is requested.
   */
  private async formatHtmlReact(run: TestRunResult): Promise<string> {
    // Lazy on purpose (see above): a static import would pull React into every
    // bundle that touches this module, HTML output requested or not.
    // eslint-disable-next-line no-restricted-syntax
    const { renderReportToHtml } = await import("executable-stories-react/ssr");
    const { report, index } = toStoryReportWithIndex(run);

    // Join the run-keyed history store onto report scenario ids so the
    // interactive report can render a per-scenario run timeline.
    let scenarioHistory: Record<string, ScenarioRunEvent[]> | undefined;
    const store = this.options.historyStore;
    if (store) {
      scenarioHistory = {};
      for (const [tcId, scenarioId] of Object.entries(index.scenarioIdByTestCaseId)) {
        const entries = store.tests[tcId]?.entries;
        if (!entries || entries.length === 0) continue;
        scenarioHistory[scenarioId] = entries.map((e) => {
          const event: ScenarioRunEvent = { timestamp: e.timestamp, status: e.status };
          if (e.runId) event.runId = e.runId;
          if (e.durationMs !== undefined) event.durationMs = e.durationMs;
          if (e.ci?.commitSha) event.commitSha = e.ci.commitSha;
          if (e.ci?.branch) event.branch = e.ci.branch;
          return event;
        });
      }
      if (Object.keys(scenarioHistory).length === 0) scenarioHistory = undefined;
    }

    return renderReportToHtml(report, {
      title: this.options.html.title,
      css: readReactReportCss(),
      theme: "light",
      // Honour the --html-no-syntax-highlighting / --html-no-mermaid flags.
      syntaxHighlighting: this.options.html.syntaxHighlighting,
      mermaid: this.options.html.mermaidEnabled,
      staleAfterDays: this.options.html.staleAfterDays,
      scenarioHistory,
      islandScript: readReactIslandScript(),
    });
  }
}

/**
 * The compiled Tailwind/shadcn stylesheet and the self-contained interactive
 * island IIFE shipped by executable-stories-react, embedded at build time by
 * scripts/embed-react-assets.mjs. Embedding (rather than resolving from
 * node_modules at runtime) is what lets `--format html` work from the
 * bun-compiled single-file binary, which has no node_modules. The reporters and
 * the binary therefore inline the version of these assets that formatters was
 * built against.
 */
function readReactReportCss(): string {
  return reactReportCss;
}

function readReactIslandScript(): string {
  return reactIslandScript;
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
