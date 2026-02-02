/**
 * Vitest reporter that reads task.meta.story from tests and writes Markdown user-story docs.
 * Ports useful options from vitest-markdown-reporter: title, permalink, summary table, GitHub Actions summary.
 *
 * Do not add value imports from "vitest" or "./bdd.js" here; this entry is loaded in vitest.config
 * before Vitest is ready. Use only `import type` from those modules.
 */
import type {
  Reporter,
  SerializedError,
  TestModule,
  TestCase,
  TestRunEndReason,
  Vitest,
} from "vitest/node";
import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import picomatch from "picomatch";
import type { StoryMeta, StoryStep, DocEntry } from "./bdd.js";

export interface OutputRule {
  /** Glob pattern(s) to match test files. E.g. "src/features/**.story.test.ts" */
  include: string | string[];
  /**
   * "aggregated": combine matched scenarios into one file
   * "colocated": write docs next to each test file
   */
  mode: "aggregated" | "colocated";
  /** For aggregated mode: output file path */
  outputFile?: string;
  /** For colocated mode: file extension. Default: ".docs.md" */
  extension?: string;
}

/** Custom doc entry renderer function */
export type CustomDocRenderer = (
  entry: { kind: "custom"; type: string; data: unknown; phase: "static" | "runtime" },
  lines: string[],
  indent: string
) => void;

export interface StoryReporterOptions {
  /** Report title (first line). Default: "User Stories" */
  title?: string;
  /** Optional description paragraph under the title */
  description?: string;
  /** Include YAML front-matter for machine parsing. Default: false */
  includeFrontMatter?: boolean;
  /**
   * Output configuration. Can be:
   * - string: single aggregated file path (default: "docs/user-stories.md")
   * - OutputRule[]: array of rules for different paths
   */
  output?: string | OutputRule[];
  /** Base URL for source links (e.g. GitHub blob). If set, adds "Source: [file](url)" under each scenario. */
  permalinkBaseUrl?: string;
  /** When GITHUB_ACTIONS, append report to job summary via @actions/core. Default: true */
  enableGithubActionsSummary?: boolean;
  /** Add a summary table (start time, duration, scenario/step counts, passed/failed/skipped). Default: false */
  includeSummaryTable?: boolean;
  /** Include a metadata block (date, package version). Default: false */
  includeMetadata?: boolean;
  /** Metadata options */
  metadata?: {
    /** Date format for metadata block. Default: "iso" */
    date?: "iso" | "locale" | false;
    /** Include package.json version in metadata block. Default: true */
    packageVersion?: boolean;
    /** Include git SHA in metadata block (short). Default: true */
    gitSha?: boolean;
  };
  /** Emit a JSON report alongside Markdown. Default: false */
  includeJson?: boolean;
  /** JSON output options */
  json?: {
    /** Output file path for aggregated mode. Default: same as Markdown with .json extension */
    outputFile?: string;
    /** Include doc entries in JSON. Default: "all" */
    includeDocs?: "all" | "static" | "runtime";
  };
  /** Coverage summary options */
  coverage?: {
    /** Include coverage summary (reads coverage-final.json). Default: false */
    include?: boolean;
    /** Path to coverage-final.json. Default: "coverage/coverage-final.json" */
    file?: string;
  };

  // Grouping & formatting
  /** How to group scenarios. Default: "file". "suite" groups by suitePath across files. */
  groupBy?: "file" | "suite" | "none";
  /** Heading level for scenario titles. Default: 3 when groupBy="file", 2 when "none" */
  scenarioHeadingLevel?: 2 | 3 | 4;
  /** Step rendering style. Default: "bullets" */
  stepStyle?: "bullets" | "gherkin";
  /** Markdown dialect (affects indentation for nested blocks). Default: "gfm" */
  markdown?: "gfm" | "commonmark" | "confluence";
  /** Include status icons on scenarios. Default: true */
  includeStatus?: boolean;
  /** Include duration in markdown output. Default: false */
  includeDurations?: boolean;
  /** Include failure error in markdown for failed scenarios. Default: true */
  includeErrorInMarkdown?: boolean;
  /** Include outputs even when there are no matched scenarios. Default: true */
  includeEmpty?: boolean;
  /** Sort files in markdown output. Default: "alpha" */
  sortFiles?: "alpha" | "source" | "none";
  /** Sort scenarios in markdown output. Default: "alpha" */
  sortScenarios?: "alpha" | "source" | "none";
  /** Filter options for scenarios */
  filter?: {
    includeTags?: string[];
    excludeTags?: string[];
    includeFiles?: string | string[];
    excludeFiles?: string | string[];
  };
  /** Include source links when permalinkBaseUrl is set. Default: true */
  includeSourceLinks?: boolean;
  /** URL template for ticket links. Use {ticket} as placeholder. E.g., "https://jira.example.com/browse/{ticket}" */
  ticketUrlTemplate?: string;

  /** Custom renderers for doc.custom() entries, keyed by type */
  customRenderers?: Record<string, CustomDocRenderer>;
}

type CoverageMetric = { total: number; covered: number; pct: number };
type CoverageSummary = {
  statements: CoverageMetric;
  branches: CoverageMetric;
  functions: CoverageMetric;
  lines?: CoverageMetric;
};
type CoverageFile = {
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
  l?: Record<string, number>;
};

interface ScenarioWithMeta {
  meta: StoryMeta;
  sourceFile?: string;
  scenarioId: string;
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  durationMs: number;
  failureDetails?: string;
}

/**
 * Reporter that collects task.meta.story from all tests and writes Markdown file(s)
 * with user-story style sections. Uses onInit for start time and ctx; onTestRunEnd for report.
 */
type ResolvedOptions = Omit<
  Required<StoryReporterOptions>,
  "permalinkBaseUrl" | "scenarioHeadingLevel" | "output" | "customRenderers" | "metadata" | "json" | "ticketUrlTemplate"
> & {
  permalinkBaseUrl?: string;
  scenarioHeadingLevel?: 2 | 3 | 4;
  output?: string | OutputRule[];
  customRenderers?: Record<string, CustomDocRenderer>;
  ticketUrlTemplate?: string;
  metadata: {
    date: "iso" | "locale" | false;
    packageVersion: boolean;
    gitSha: boolean;
  };
  json: {
    outputFile?: string;
    includeDocs: "all" | "static" | "runtime";
  };
};

/** Known test file extensions to strip when generating colocated file names */
const TEST_EXTENSIONS = [".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx", ".test.js", ".spec.js"];

/**
 * Normalize Vitest onCoverage payload (Istanbul/V8 shape) to CoverageFile map.
 * Returns undefined if payload is not a known coverage map shape.
 */
function normalizeCoveragePayload(coverage: unknown): Record<string, CoverageFile> | undefined {
  if (!coverage || typeof coverage !== "object" || Array.isArray(coverage)) return undefined;
  const raw = coverage as Record<string, unknown>;
  const data: Record<string, CoverageFile> = {};
  for (const [filePath, file] of Object.entries(raw)) {
    if (file && typeof file === "object" && "s" in file && "f" in file && "b" in file) {
      data[filePath] = file as CoverageFile;
    }
  }
  if (Object.keys(data).length === 0) return undefined;
  return data;
}

/**
 * Vitest reporter that generates Markdown documentation from scenario tests.
 *
 * Reads `task.meta.story` from each test and generates user-story style Markdown.
 * Supports colocated output (next to test files) or aggregated output (single file).
 *
 * @example
 * ```ts
 * // vitest.config.ts - use /reporter subpath so Vitest is not loaded in config context
 * import { defineConfig } from "vitest/config";
 * import { StoryReporter } from "vitest-executable-stories/reporter";
 *
 * export default defineConfig({
 *   test: {
 *     reporters: ["default", new StoryReporter()],
 *   },
 * });
 * ```
 */
export default class StoryReporter implements Reporter {
  private options: ResolvedOptions;
  private outputRules: OutputRule[];
  private defaultAggregatedFile: string;
  private ctx: Vitest | undefined;
  private startTime: number = 0;
  private packageVersion: string | undefined;
  private gitSha: string | undefined;
  private coverageSummary: CoverageSummary | undefined;

  constructor(options: StoryReporterOptions = {}) {
    this.options = {
      title: options.title ?? "User Stories",
      description: options.description ?? "",
      includeFrontMatter: options.includeFrontMatter ?? false,
      output: options.output,
      permalinkBaseUrl: options.permalinkBaseUrl,
      enableGithubActionsSummary: options.enableGithubActionsSummary ?? true,
      includeSummaryTable: options.includeSummaryTable ?? false,
      includeMetadata: options.includeMetadata ?? true,
      metadata: {
        date: options.metadata?.date ?? "iso",
        packageVersion: options.metadata?.packageVersion ?? true,
        gitSha: options.metadata?.gitSha ?? true,
      },
      includeJson: options.includeJson ?? false,
      json: {
        outputFile: options.json?.outputFile,
        includeDocs: options.json?.includeDocs ?? "all",
      },
      coverage: {
        include: options.coverage?.include ?? false,
        file: options.coverage?.file ?? "coverage/coverage-final.json",
      },
      groupBy: options.groupBy ?? "file",
      scenarioHeadingLevel: options.scenarioHeadingLevel,
      stepStyle: options.stepStyle ?? "bullets",
      markdown: options.markdown ?? "gfm",
      includeStatus: options.includeStatus ?? true,
      includeDurations: options.includeDurations ?? false,
      includeErrorInMarkdown: options.includeErrorInMarkdown ?? true,
      includeEmpty: options.includeEmpty ?? true,
      sortFiles: options.sortFiles ?? "alpha",
      sortScenarios: options.sortScenarios ?? "alpha",
      filter: options.filter ?? {},
      includeSourceLinks: options.includeSourceLinks ?? true,
      ticketUrlTemplate: options.ticketUrlTemplate,
      customRenderers: options.customRenderers,
    };

    // Normalize output config into rules
    if (typeof options.output === "string") {
      // output: "path/to/file.md" → single aggregated rule
      this.outputRules = [{ include: "**/*", mode: "aggregated", outputFile: options.output }];
    } else if (Array.isArray(options.output)) {
      this.outputRules = options.output;
    } else {
      // No output specified, default to colocated output next to test files
      this.outputRules = [{ include: "**/*", mode: "colocated" }];
    }

    this.defaultAggregatedFile = typeof options.output === "string"
      ? options.output
      : "docs/user-stories.md";
  }

  onInit(ctx: Vitest): void {
    this.ctx = ctx;
    this.startTime = Date.now();
    if (this.options.includeMetadata && this.options.metadata.packageVersion) {
      this.packageVersion = this.readPackageVersion();
    }
    if (this.options.includeMetadata && this.options.metadata.gitSha) {
      this.gitSha = this.readGitSha();
    }
  }

  onCoverage(coverage: unknown): void {
    if (!this.options.coverage.include) return;
    const data = normalizeCoveragePayload(coverage);
    if (data) {
      this.coverageSummary = this.summarizeCoverage(data);
    }
  }

  onTestRunEnd(
    testModules: ReadonlyArray<TestModule>,
    _unhandledErrors: ReadonlyArray<SerializedError>,
    reason: TestRunEndReason,
  ): void {
    if (reason === "interrupted") {
      return;
    }
    if (this.options.coverage.include && this.coverageSummary === undefined) {
      this.coverageSummary = this.readCoverageSummary();
    }
    // Key by (file::scenario) to prevent collisions across files
    const scenarios = new Map<string, ScenarioWithMeta>();
    const root = this.ctx?.config?.root ?? process.cwd();

    for (const mod of testModules) {
      const collection = mod.children;
      if (!collection) continue;
      const moduleId = mod.moduleId ?? mod.relativeModuleId ?? "";
      const absoluteModuleId = path.isAbsolute(moduleId)
        ? moduleId
        : path.resolve(root, moduleId);
      const sourcePath = path.relative(root, absoluteModuleId);

      for (const test of collection.allTests()) {
        const meta = this.getStoryMeta(test);
        if (!meta?.scenario || !Array.isArray(meta.steps)) continue;

        // Key by (file + scenario) to prevent collisions
        const key = `${sourcePath}::${meta.scenario}`;
        const scenarioId = this.createScenarioId(sourcePath, meta.scenario);
        const existing = scenarios.get(key);
        const result = test.result?.();
        const state = result?.state ?? "pending";
        const passed = state === "passed" ? 1 : 0;
        const failed = state === "failed" ? 1 : 0;
        const skipped = state === "skipped" || state === "pending" ? 1 : 0;
        const durationMs = typeof (result as { duration?: number } | undefined)?.duration === "number"
          ? (result as unknown as { duration: number }).duration
          : 0;
        const errors = state === "failed" && result
          ? (result as { errors?: SerializedError[] }).errors
          : undefined;
        const failureDetails = errors?.length
          ? this.formatFailureFromErrors(errors)
          : undefined;

        if (existing) {
          existing.passed += passed;
          existing.failed += failed;
          existing.skipped += skipped;
          existing.durationMs += durationMs;
          if (failureDetails && existing.failed > 0 && existing.failureDetails == null) {
            existing.failureDetails = failureDetails;
          }
        } else {
          scenarios.set(key, {
            meta,
            sourceFile: sourcePath || undefined,
            scenarioId,
            passed,
            failed,
            skipped,
            todo: 0,
            durationMs,
            failureDetails: failed ? failureDetails : undefined,
          });
        }
      }
    }

    // Count todo/skip from step modes for accurate status
    for (const scenario of scenarios.values()) {
      const todoSteps = scenario.meta.steps.filter((s) => s.mode === "todo").length;
      const skipSteps = scenario.meta.steps.filter((s) => s.mode === "skip").length;
      scenario.todo = todoSteps;
      // Add skip steps to skipped count if not already counted
      if (skipSteps > 0 && scenario.skipped === 0) {
        scenario.skipped = skipSteps;
      }
    }

    const permalinkBaseUrl =
      this.options.permalinkBaseUrl ?? this.buildGithubActionsPermalinkBase();
    const durationSec = (Date.now() - this.startTime) / 1000;
    const startTime = new Date(this.startTime);

    const filteredScenarios = this.applyFilters(scenarios);

    // Route scenarios to output files based on rules
    const outputMap = this.routeScenariosToOutputs(filteredScenarios);

    // If no scenarios matched any rule and no default was added, write empty default
    if (outputMap.size === 0 && this.options.includeEmpty) {
      outputMap.set(this.defaultAggregatedFile, []);
    }

    // Track all markdown content for GitHub Actions summary
    const allMarkdownParts: string[] = [];

    // Write each output file
    for (const [outputPath, outputScenarios] of outputMap) {
      if (!this.options.includeEmpty && outputScenarios.length === 0) continue;
      const md = this.renderMarkdown(
        outputScenarios,
        outputPath,
        permalinkBaseUrl,
        startTime,
        durationSec,
      );

      const outFile = path.resolve(process.cwd(), outputPath);
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, md + "\n", "utf8");

      allMarkdownParts.push(md);

      if (this.options.includeJson) {
        const jsonOutFile = this.getJsonOutputPath(outputPath);
        const json = this.renderJsonReport(outputScenarios, outputPath, startTime, durationSec);
        fs.mkdirSync(path.dirname(jsonOutFile), { recursive: true });
        fs.writeFileSync(jsonOutFile, JSON.stringify(json, null, 2) + "\n", "utf8");
      }
    }

    if (
      process.env.GITHUB_ACTIONS === "true" &&
      this.options.enableGithubActionsSummary
    ) {
      // Combine all markdown for GitHub summary
      const combinedMd = allMarkdownParts.join("\n\n---\n\n");
      this.appendGithubSummary(combinedMd).catch(() => {});
    }
  }

  /**
   * Render markdown content for a set of scenarios.
   */
  /**
   * Render complete markdown content for a set of scenarios.
   * Includes title, description, metadata, summary table, and scenario sections.
   */
  private renderMarkdown(
    outputScenarios: ScenarioWithMeta[],
    outputPath: string,
    permalinkBaseUrl: string | undefined,
    startTime: Date,
    durationSec: number,
  ): string {
    const lines: string[] = [];
    if (this.options.includeFrontMatter) {
      const frontMatter = this.buildFrontMatter(outputScenarios, outputPath, startTime, durationSec);
      lines.push("---");
      lines.push(...this.renderYaml(frontMatter));
      lines.push("---");
      lines.push("");
    }
    lines.push(`# ${this.options.title}`);
    lines.push("");
    if (this.options.description) {
      lines.push(this.options.description);
      lines.push("");
    }

    if (this.options.includeMetadata) {
      this.renderMetadata(lines, startTime);
      lines.push("");
    }

    if (this.options.includeSummaryTable) {
      const totalScenarios = outputScenarios.length;
      const totalSteps = outputScenarios.reduce(
        (acc, s) => acc + s.meta.steps.length,
        0,
      );
      const totalPassed = outputScenarios.reduce(
        (acc, s) => acc + s.passed,
        0,
      );
      const totalFailed = outputScenarios.reduce(
        (acc, s) => acc + s.failed,
        0,
      );
      const totalSkipped = outputScenarios.reduce(
        (acc, s) => acc + s.skipped,
        0,
      );
      const totalDurationMs = outputScenarios.reduce(
        (acc, s) => acc + s.durationMs,
        0,
      );
      lines.push("| Start time | Duration |");
      lines.push("| --- | ---: |");
      lines.push(
        `| ${startTime.toLocaleString().replace(/\u202F/g, " ")} | ${durationSec.toFixed(2)} s |`,
      );
      lines.push("");
      if (this.options.includeDurations) {
        lines.push(
          "| Scenarios | Steps | Passed | Failed | Skipped | Duration |",
        );
        lines.push("| --- | ---: | ---: | ---: | ---: | ---: |");
        lines.push(
          `| ${totalScenarios} | ${totalSteps} | ${totalPassed} | ${totalFailed} | ${totalSkipped} | ${this.formatDuration(totalDurationMs)} |`,
        );
      } else {
        lines.push(
          "| Scenarios | Steps | Passed | Failed | Skipped |",
        );
        lines.push("| --- | ---: | ---: | ---: | ---: |");
        lines.push(
          `| ${totalScenarios} | ${totalSteps} | ${totalPassed} | ${totalFailed} | ${totalSkipped} |`,
        );
      }
      lines.push("");
    }

    // Determine heading levels
    const groupBy = this.options.groupBy;
    const fileHeadingLevel = 2;

    // Check if this is a colocated output (single source file)
    const uniqueSourceFiles = new Set(outputScenarios.map((s) => s.sourceFile ?? "unknown"));
    const isColocated = uniqueSourceFiles.size === 1 && this.isColocatedOutput(outputPath);

    if (isColocated) {
      // Colocated output - render with suite path grouping within single file
      this.renderSuiteGroups(outputScenarios, lines, 2, permalinkBaseUrl);
    } else if (groupBy === "none") {
      // No grouping - flat list without file headers
      const scenarioHeadingLevel = this.options.scenarioHeadingLevel ?? 3;
      const scenarioHeading = "#".repeat(scenarioHeadingLevel);
      const sorted = this.sortScenarios(outputScenarios);

      for (const scenario of sorted) {
        this.renderScenario(lines, scenario, scenarioHeading, permalinkBaseUrl);
      }
    } else if (groupBy === "suite") {
      // Group by suite path across files
      this.renderSuiteGroups(outputScenarios, lines, 2, permalinkBaseUrl);
    } else {
      // Group by file (default)
      const byFile = new Map<string, ScenarioWithMeta[]>();
      for (const scenario of outputScenarios) {
        const file = scenario.sourceFile ?? "unknown";
        const existing = byFile.get(file);
        if (existing) {
          existing.push(scenario);
        } else {
          byFile.set(file, [scenario]);
        }
      }

      // Sort files (optional)
      const sortedFiles = this.sortFiles([...byFile.keys()], byFile);

      for (const file of sortedFiles) {
        const fileScenarios = byFile.get(file)!;
        lines.push(`${"#".repeat(fileHeadingLevel)} ${file}`);
        if (this.options.includeSourceLinks && permalinkBaseUrl && file !== "unknown") {
          const href = permalinkBaseUrl.replace(/\/$/, "") + "/" + file;
          lines.push(`Source: [${file}](${href})`);
        }
        lines.push("");

        // Render suite groups within file
        this.renderSuiteGroups(fileScenarios, lines, 3, undefined);
      }
    }

    return lines.join("\n").trimEnd() || "_No scenarios found._";
  }

  /**
   * Group scenarios by their suitePath.
   */
  private groupBySuitePath(
    scenarios: ScenarioWithMeta[],
  ): { path: string[]; scenarios: ScenarioWithMeta[] }[] {
    const grouped = new Map<string, { path: string[]; scenarios: ScenarioWithMeta[] }>();

    for (const scenario of scenarios) {
      const path = scenario.meta.suitePath ?? [];
      const key = path.join("::");

      const existing = grouped.get(key);
      if (existing) {
        existing.scenarios.push(scenario);
      } else {
        grouped.set(key, { path, scenarios: [scenario] });
      }
    }

    // Sort groups alphabetically by key for stable output
    const sorted = [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, group]) => group);

    return sorted;
  }

  /**
   * Render scenarios grouped by suite path.
   */
  private renderSuiteGroups(
    scenarios: ScenarioWithMeta[],
    lines: string[],
    baseLevel: number,
    permalinkBaseUrl: string | undefined,
  ): void {
    const groups = this.groupBySuitePath(scenarios);

    for (const { path, scenarios: suiteScenarios } of groups) {
      // Only render suite header if path exists and has content
      if (path.length > 0) {
        const heading = "#".repeat(baseLevel);
        lines.push(`${heading} ${path.join(" - ")}`);
        lines.push("");
      }

      // Sort scenarios within group using existing comparator for stable output
      const sortedScenarios = this.sortScenarios(suiteScenarios);

      // Render scenarios at next level (or same if no suite path), capped at ####
      const storyLevel = Math.min(path.length > 0 ? baseLevel + 1 : baseLevel, 4);
      const scenarioHeading = "#".repeat(storyLevel);

      for (const scenario of sortedScenarios) {
        this.renderScenario(lines, scenario, scenarioHeading, permalinkBaseUrl);
      }
    }
  }

  private renderJsonReport(
    outputScenarios: ScenarioWithMeta[],
    outputPath: string,
    startTime: Date,
    durationSec: number,
  ): Record<string, unknown> {
    const meta: Record<string, unknown> = {
      schemaVersion: 1,
      title: this.options.title,
      description: this.options.description || undefined,
      generatedAt: startTime.toISOString(),
      durationSec,
      repoRoot: this.getRepoRootRelative(),
      packageVersion: this.packageVersion,
      gitSha: this.gitSha ? (this.gitSha.length > 7 ? this.gitSha.slice(0, 7) : this.gitSha) : undefined,
      outputPath,
      coverage: this.coverageSummary ?? undefined,
    };

    const scenarios = outputScenarios.map((scenario) => this.toJsonScenario(scenario));
    return { meta, scenarios };
  }

  private toJsonScenario(scenario: ScenarioWithMeta): Record<string, unknown> {
    const { meta, sourceFile, passed, failed, skipped, todo, durationMs, scenarioId } = scenario;
    return {
      id: scenarioId,
      title: meta.scenario,
      sourceFile,
      tags: meta.tags ?? [],
      tickets: meta.tickets ?? [],
      status: { passed, failed, skipped, todo },
      durationMs,
      steps: meta.steps.map((step) => ({
        keyword: step.keyword,
        text: step.text,
        mode: step.mode ?? "normal",
        docs: this.filterDocs(step.docs),
      })),
    };
  }

  /**
   * Check if an output path is a colocated output (based on extension pattern).
   */
  private isColocatedOutput(outputPath: string): boolean {
    // Colocated files typically have .docs.md or similar extension next to test files
    // Check if any rule with colocated mode could produce this path
    for (const rule of this.outputRules) {
      if (rule.mode === "colocated") {
        const ext = rule.extension ?? ".docs.md";
        if (outputPath.endsWith(ext)) {
          return true;
        }
      }
    }
    return false;
  }

  private getJsonOutputPath(outputPath: string): string {
    if (!this.isColocatedOutput(outputPath) && this.options.json.outputFile) {
      return path.resolve(process.cwd(), this.options.json.outputFile);
    }
    if (outputPath.endsWith(".md")) {
      return path.resolve(process.cwd(), outputPath.replace(/\.md$/i, ".json"));
    }
    return path.resolve(process.cwd(), outputPath + ".json");
  }

  private renderScenario(
    lines: string[],
    scenario: ScenarioWithMeta,
    headingPrefix: string,
    permalinkBaseUrl: string | undefined,
  ): void {
    const { meta, sourceFile, passed, failed, skipped, todo, durationMs } = scenario;
    const includeStatus = this.options.includeStatus;

    // Compute status icon with precedence:
    // 1. ❌ if any failed
    // 2. ✅ if all passed (or doc-only story with passed > 0)
    // 3. 📝 if all todo
    // 4. ⏩ if all skipped
    // 5. ⚠️ otherwise (mixed state)
    let icon = "";
    if (includeStatus) {
      const totalSteps = meta.steps.length;
      const isDocOnly = totalSteps === 0;
      if (failed > 0) {
        icon = "❌ ";
      } else if (isDocOnly ? passed > 0 : passed === totalSteps) {
        icon = "✅ ";
      } else if (!isDocOnly && todo === totalSteps) {
        icon = "📝 ";
      } else if (isDocOnly ? skipped > 0 && passed === 0 : skipped === totalSteps) {
        icon = "⏩ ";
      } else if (isDocOnly && passed === 0 && failed === 0 && skipped === 0) {
        icon = "✅ "; // Doc-only with no explicit result, assume passed
      } else {
        icon = "⚠️ ";  // Mixed state
      }
    }

    const durationSuffix = this.options.includeDurations && durationMs > 0
      ? ` _(${this.formatDuration(durationMs)})_`
      : "";
    lines.push(`${headingPrefix} ${icon}${meta.scenario}${durationSuffix}`);

    if (this.options.includeSourceLinks && permalinkBaseUrl && sourceFile) {
      const href = permalinkBaseUrl.replace(/\/$/, "") + "/" + sourceFile;
      lines.push(`Source: [${sourceFile}](${href})`);
    }

    // Render tags if present
    if (meta.tags && meta.tags.length > 0) {
      lines.push(`Tags: ${meta.tags.map((t) => `\`${t}\``).join(", ")}`);
    }

    // Render tickets if present
    if (meta.tickets && meta.tickets.length > 0) {
      const template = this.options.ticketUrlTemplate;
      if (template) {
        const links = meta.tickets.map((t) => `[${t}](${template.replace("{ticket}", t)})`);
        lines.push(`Tickets: ${links.join(", ")}`);
      } else {
        lines.push(`Tickets: ${meta.tickets.map((t) => `\`${t}\``).join(", ")}`);
      }
    }

    lines.push("");

    // Render steps
    for (const step of meta.steps) {
      this.renderStep(lines, step);
    }

    if (failed > 0 && scenario.failureDetails && this.options.includeErrorInMarkdown) {
      lines.push("**Failure**");
      lines.push("");
      lines.push("```text");
      lines.push(scenario.failureDetails);
      lines.push("```");
      lines.push("");
    }

    lines.push("");
  }

  private formatFailureFromErrors(errors: SerializedError[]): string {
    const err = errors[0];
    if (!err) return "";
    const parts: string[] = [];
    if (typeof err.message === "string" && err.message) {
      parts.push(err.message);
    }
    const diff = err.diff != null && typeof err.diff === "string" ? err.diff : undefined;
    if (diff) {
      parts.push("");
      parts.push(diff);
    }
    const stack = typeof err.stack === "string" && err.stack ? err.stack : undefined;
    if (stack) {
      parts.push("");
      parts.push(stack);
    }
    return parts.length ? parts.join("\n") : "Unknown error";
  }

  private renderStep(lines: string[], step: StoryStep): void {
    const { keyword, text, mode, docs } = step;
    const stepStyle = this.options.stepStyle;

    // Add mode indicator for non-normal steps
    let modeIndicator = "";
    if (mode === "skip") {
      modeIndicator = " _(skipped)_";
    } else if (mode === "todo") {
      modeIndicator = " _(todo)_";
    } else if (mode === "fails") {
      modeIndicator = " _(expected to fail)_";
    } else if (mode === "concurrent") {
      modeIndicator = " _(concurrent)_";
    }

    if (stepStyle === "gherkin") {
      lines.push(`**${keyword}** ${text}${modeIndicator}`);
    } else {
      // bullets (default)
      lines.push(`- **${keyword}** ${text}${modeIndicator}`);
    }

    // Render doc entries if present (2-space indent)
    if (docs && docs.length > 0) {
      const indent = stepStyle === "gherkin"
        ? ""
        : this.options.markdown === "confluence"
          ? "  "
          : "    ";
      for (const entry of docs) {
        this.renderDocEntry(lines, entry, indent);
      }
    }
  }

  /**
   * Render a single documentation entry to markdown lines.
   * Handles all built-in entry kinds and delegates custom entries to custom renderers.
   */
  private renderDocEntry(lines: string[], entry: DocEntry, indent: string): void {
    const push = (line: string) => {
      lines.push(`${indent}${line}`);
    };

    switch (entry.kind) {
      case "note":
        push(`_Note:_ ${entry.text}`);
        break;
      case "kv": {
        const val = typeof entry.value === "string" ? entry.value : JSON.stringify(entry.value);
        push(`**${entry.label}:** ${val}`);
        break;
      }
      case "code":
        push(`**${entry.label}**`);
        lines.push(indent);
        push(`\`\`\`${entry.lang ?? ""}`);
        for (const line of entry.content.split("\n")) {
          push(line);
        }
        push("```");
        lines.push(indent);
        break;
      case "table":
        push(`**${entry.label}**`);
        lines.push(indent);
        push(`| ${entry.columns.join(" | ")} |`);
        push(`| ${entry.columns.map(() => "---").join(" | ")} |`);
        for (const row of entry.rows) {
          push(`| ${row.join(" | ")} |`);
        }
        lines.push(indent);
        break;
      case "link":
        push(`[${entry.label}](${entry.url})`);
        break;
      case "section":
        push(`**${entry.title}**`);
        lines.push(indent);
        for (const line of entry.markdown.split("\n")) {
          push(line);
        }
        lines.push(indent);
        break;
      case "mermaid":
        if (entry.title) push(`**${entry.title}**`);
        push("```mermaid");
        for (const line of entry.code.split("\n")) {
          push(line);
        }
        push("```");
        break;
      case "screenshot":
        push(`![${entry.alt ?? "Screenshot"}](${entry.path})`);
        break;
      case "custom": {
        const renderer = this.options.customRenderers?.[entry.type];
        if (renderer) {
          // Use custom renderer
          renderer(entry, lines, indent);
        } else {
          // Default: render as JSON with type label
          push(`**[${entry.type}]**`);
          lines.push(indent);
          push("```json");
          for (const line of JSON.stringify(entry.data, null, 2).split("\n")) {
            push(line);
          }
          push("```");
          lines.push(indent);
        }
        break;
      }
    }
  }

  private buildGithubActionsPermalinkBase(): string | undefined {
    if (process.env.GITHUB_ACTIONS !== "true") return undefined;
    const server = process.env.GITHUB_SERVER_URL;
    const repo = process.env.GITHUB_REPOSITORY;
    const sha = process.env.GITHUB_SHA;
    const workspace = process.env.GITHUB_WORKSPACE;
    const root = this.ctx?.config?.root ?? process.cwd();
    if (!server || !repo || !sha || !workspace) return undefined;
    const subtree = path.relative(workspace, root);
    const suffix = subtree && !subtree.endsWith("/") ? "/" : "";
    return `${server}/${repo}/blob/${sha}/${subtree}${suffix}`;
  }

  private readPackageVersion(): string | undefined {
    try {
      const root = this.ctx?.config?.root ?? process.cwd();
      const pkgPath = path.join(root, "package.json");
      const raw = fs.readFileSync(pkgPath, "utf8");
      const parsed = JSON.parse(raw) as { version?: string };
      return parsed.version;
    } catch {
      return undefined;
    }
  }

  private readGitSha(): string | undefined {
    const envSha = process.env.GITHUB_SHA || process.env.GIT_COMMIT;
    if (envSha) return envSha;

    const root = this.ctx?.config?.root ?? process.cwd();
    const gitDir = this.findGitDir(root);
    if (!gitDir) return undefined;

    try {
      const headPath = path.join(gitDir, "HEAD");
      const head = fs.readFileSync(headPath, "utf8").trim();
      if (head.startsWith("ref:")) {
        const refPath = head.replace("ref:", "").trim();
        const refFile = path.join(gitDir, refPath);
        if (fs.existsSync(refFile)) {
          return fs.readFileSync(refFile, "utf8").trim();
        }

        const packedRefs = path.join(gitDir, "packed-refs");
        if (fs.existsSync(packedRefs)) {
          const lines = fs.readFileSync(packedRefs, "utf8").split("\n");
          for (const line of lines) {
            if (!line || line.startsWith("#") || line.startsWith("^")) continue;
            const [sha, ref] = line.split(" ");
            if (ref === refPath) return sha;
          }
        }
        return undefined;
      }
      return head;
    } catch {
      return undefined;
    }
  }

  private findGitDir(start: string): string | undefined {
    let current = start;
    while (true) {
      const candidate = path.join(current, ".git");
      if (fs.existsSync(candidate)) return candidate;
      const parent = path.dirname(current);
      if (parent === current) return undefined;
      current = parent;
    }
  }

  private renderMetadata(lines: string[], startTime: Date): void {
    const dateSetting = this.options.metadata.date;
    const version = this.options.metadata.packageVersion ? this.packageVersion : undefined;
    const gitSha = this.options.metadata.gitSha ? this.gitSha : undefined;
    const rows: Array<[string, string]> = [];

    if (dateSetting) {
      const dateValue = dateSetting === "iso" ? startTime.toISOString() : startTime.toLocaleString();
      rows.push(["Date", dateValue]);
    }
    if (version) {
      rows.push(["Version", version]);
    }
    if (gitSha) {
      const shortSha = gitSha.length > 7 ? gitSha.slice(0, 7) : gitSha;
      rows.push(["Git SHA", shortSha]);
    }

    if (rows.length === 0) return;

    lines.push("| Key | Value |");
    lines.push("| --- | --- |");
    for (const [key, value] of rows) {
      lines.push(`| ${key} | ${value} |`);
    }
    if (this.coverageSummary) {
      lines.push("");
      lines.push("| Coverage | Value |");
      lines.push("| --- | --- |");
      lines.push(`| Statements | ${this.coverageSummary.statements.pct}% |`);
      lines.push(`| Branches | ${this.coverageSummary.branches.pct}% |`);
      lines.push(`| Functions | ${this.coverageSummary.functions.pct}% |`);
      if (this.coverageSummary.lines) {
        lines.push(`| Lines | ${this.coverageSummary.lines.pct}% |`);
      }
    }
  }

  private getRepoRootRelative(): string {
    const root = this.ctx?.config?.root ?? process.cwd();
    const rel = path.relative(process.cwd(), root);
    return rel === "" ? "." : rel;
  }

  private formatDuration(durationMs: number): string {
    if (durationMs < 1000) return `${durationMs} ms`;
    return `${(durationMs / 1000).toFixed(2)} s`;
  }

  private sortScenarios(scenarios: ScenarioWithMeta[]): ScenarioWithMeta[] {
    if (this.options.sortScenarios === "alpha") {
      return [...scenarios].sort((a, b) => a.meta.scenario.localeCompare(b.meta.scenario));
    }
    return scenarios;
  }

  private sortFiles(files: string[], byFile: Map<string, ScenarioWithMeta[]>): string[] {
    if (this.options.sortFiles === "alpha") {
      return [...files].sort();
    }
    if (this.options.sortFiles === "source") {
      return [...byFile.keys()];
    }
    return files;
  }

  private filterDocs(docs: DocEntry[] | undefined): DocEntry[] | undefined {
    if (!docs) return undefined;
    if (this.options.json.includeDocs === "all") return docs;
    const phase = this.options.json.includeDocs;
    const filtered = (docs ?? []).filter((doc) => doc.phase === phase);
    return filtered.length > 0 ? filtered : undefined;
  }

  private buildFrontMatter(
    outputScenarios: ScenarioWithMeta[],
    outputPath: string,
    startTime: Date,
    durationSec: number,
  ): Record<string, unknown> {
    const totalSteps = outputScenarios.reduce((acc, s) => acc + s.meta.steps.length, 0);
    return {
      schemaVersion: 1,
      title: this.options.title,
      description: this.options.description || undefined,
      generatedAt: startTime.toISOString(),
      durationSec,
      repoRoot: this.getRepoRootRelative(),
      packageVersion: this.packageVersion,
      gitSha: this.gitSha ? (this.gitSha.length > 7 ? this.gitSha.slice(0, 7) : this.gitSha) : undefined,
      outputPath,
      scenarios: outputScenarios.length,
      steps: totalSteps,
      coverage: this.coverageSummary ?? undefined,
    };
  }

  private renderYaml(data: Record<string, unknown>, indent: number = 0): string[] {
    const lines: string[] = [];
    const pad = " ".repeat(indent);
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        lines.push(`${pad}${key}:`);
        for (const item of value) {
          lines.push(`${pad}  - ${String(item)}`);
        }
      } else if (value && typeof value === "object") {
        lines.push(`${pad}${key}:`);
        lines.push(...this.renderYaml(value as Record<string, unknown>, indent + 2));
      } else {
        lines.push(`${pad}${key}: ${String(value)}`);
      }
    }
    return lines;
  }

  private applyFilters(scenarios: Map<string, ScenarioWithMeta>): Map<string, ScenarioWithMeta> {
    const result = new Map<string, ScenarioWithMeta>();
    const includeTags = this.options.filter.includeTags ?? [];
    const excludeTags = this.options.filter.excludeTags ?? [];
    const includeFiles = this.options.filter.includeFiles;
    const excludeFiles = this.options.filter.excludeFiles;

    for (const [key, scenario] of scenarios) {
      const tags = scenario.meta.tags ?? [];
      if (includeTags.length > 0 && !tags.some((t) => includeTags.includes(t))) {
        continue;
      }
      if (excludeTags.length > 0 && tags.some((t) => excludeTags.includes(t))) {
        continue;
      }
      if (includeFiles && !this.matchFile(includeFiles, scenario.sourceFile ?? "")) {
        continue;
      }
      if (excludeFiles && this.matchFile(excludeFiles, scenario.sourceFile ?? "")) {
        continue;
      }
      result.set(key, scenario);
    }

    return result;
  }

  private matchFile(patterns: string | string[], file: string): boolean {
    const list = Array.isArray(patterns) ? patterns : [patterns];
    for (const pattern of list) {
      if (picomatch.isMatch(file, pattern)) return true;
    }
    return false;
  }

  private createScenarioId(sourceFile: string, scenarioTitle: string): string {
    return createHash("sha1").update(`${sourceFile}::${scenarioTitle}`).digest("hex").slice(0, 12);
  }

  private readCoverageSummary(): CoverageSummary | undefined {
    try {
      const root = this.ctx?.config?.root ?? process.cwd();
      const coverageFile = this.options.coverage?.file ?? "coverage/coverage-final.json";
      const coveragePath = path.resolve(root, coverageFile);
      if (!fs.existsSync(coveragePath)) return undefined;
      const raw = fs.readFileSync(coveragePath, "utf8");
      const data = JSON.parse(raw) as Record<string, CoverageFile>;
      return this.summarizeCoverage(data);
    } catch {
      return undefined;
    }
  }

  private summarizeCoverage(data: Record<string, CoverageFile>): CoverageSummary | undefined {
    let statementsTotal = 0;
    let statementsCovered = 0;
    let functionsTotal = 0;
    let functionsCovered = 0;
    let branchesTotal = 0;
    let branchesCovered = 0;
    let linesTotal = 0;
    let linesCovered = 0;
    let hasLines = false;

    for (const file of Object.values(data)) {
      for (const count of Object.values(file.s)) {
        statementsTotal += 1;
        if (count > 0) statementsCovered += 1;
      }
      for (const count of Object.values(file.f)) {
        functionsTotal += 1;
        if (count > 0) functionsCovered += 1;
      }
      for (const counts of Object.values(file.b)) {
        for (const count of counts) {
          branchesTotal += 1;
          if (count > 0) branchesCovered += 1;
        }
      }
      if (file.l) {
        hasLines = true;
        for (const count of Object.values(file.l)) {
          linesTotal += 1;
          if (count > 0) linesCovered += 1;
        }
      }
    }

    if (statementsTotal === 0 && functionsTotal === 0 && branchesTotal === 0 && !hasLines) {
      return undefined;
    }

    const summary: CoverageSummary = {
      statements: this.coverageMetric(statementsCovered, statementsTotal),
      branches: this.coverageMetric(branchesCovered, branchesTotal),
      functions: this.coverageMetric(functionsCovered, functionsTotal),
    };
    if (hasLines) {
      summary.lines = this.coverageMetric(linesCovered, linesTotal);
    }
    return summary;
  }

  private coverageMetric(covered: number, total: number): CoverageMetric {
    const pct = total === 0 ? 100 : Math.round((covered / total) * 100);
    return { total, covered, pct };
  }

  private async appendGithubSummary(reportText: string): Promise<void> {
    try {
      // Dynamic import; @actions/core is optional (only in CI). No type ref so TS doesn't require the package.
      const { summary } = await import("@actions/core");
      summary.addRaw(reportText);
      await summary.write();
    } catch {
      // @actions/core not available or not in Actions
    }
  }

  private getStoryMeta(test: TestCase): StoryMeta | undefined {
    const meta = test.meta() as Record<string, unknown>;
    const story = meta?.["story"];
    return story as StoryMeta | undefined;
  }

  /**
   * Find the first matching output rule for a given source file.
   * Returns undefined if no rule matches.
   */
  private findMatchingRule(sourceFile: string): OutputRule | undefined {
    for (const rule of this.outputRules) {
      const patterns = Array.isArray(rule.include) ? rule.include : [rule.include];
      for (const pattern of patterns) {
        if (picomatch.isMatch(sourceFile, pattern)) {
          return rule;
        }
      }
    }
    return undefined;
  }

  /**
   * Generate colocated output file path from a test file path.
   * Strips known test extensions and appends the given extension.
   */
  private getColocatedPath(testFile: string, extension: string = ".docs.md"): string {
    let base = testFile;
    for (const ext of TEST_EXTENSIONS) {
      if (base.endsWith(ext)) {
        base = base.slice(0, -ext.length);
        break;
      }
    }
    return base + extension;
  }

  /**
   * Route scenarios to their output destinations based on rules.
   * Returns a map of output file path to scenarios to write there.
   *
   * Behavior is explicit (Vitest-like):
   * - If output rules are provided, only those rules apply. Unmatched files are ignored.
   * - If no output rules are provided, all scenarios go to the default aggregated file.
   * - Add a catch-all rule if you want fallback.
   */
  private routeScenariosToOutputs(
    scenarios: Map<string, ScenarioWithMeta>,
  ): Map<string, ScenarioWithMeta[]> {
    // Group scenarios by their source file first
    const bySourceFile = new Map<string, ScenarioWithMeta[]>();
    for (const scenario of scenarios.values()) {
      const file = scenario.sourceFile ?? "unknown";
      const existing = bySourceFile.get(file);
      if (existing) {
        existing.push(scenario);
      } else {
        bySourceFile.set(file, [scenario]);
      }
    }

    // Route each source file's scenarios to output destinations
    const outputMap = new Map<string, ScenarioWithMeta[]>();
    const defaultScenarios: ScenarioWithMeta[] = [];

    for (const [sourceFile, fileScenarios] of bySourceFile) {
      const rule = this.findMatchingRule(sourceFile);

      if (!rule) {
        // No matching rule:
        // - If output rules are provided, unmatched files are ignored (explicit behavior)
        // - If no output rules, use default aggregated file
        if (this.outputRules.length === 0) {
          defaultScenarios.push(...fileScenarios);
        }
        // else: ignore unmatched files when rules are provided
        continue;
      }

      let outputPath: string;
      if (rule.mode === "colocated") {
        outputPath = this.getColocatedPath(sourceFile, rule.extension ?? ".docs.md");
      } else {
        // aggregated
        outputPath = rule.outputFile ?? this.defaultAggregatedFile;
      }

      const existing = outputMap.get(outputPath);
      if (existing) {
        existing.push(...fileScenarios);
      } else {
        outputMap.set(outputPath, [...fileScenarios]);
      }
    }

    // Add unmatched scenarios to default file (only when no rules are provided)
    if (defaultScenarios.length > 0) {
      const existing = outputMap.get(this.defaultAggregatedFile);
      if (existing) {
        existing.push(...defaultScenarios);
      } else {
        outputMap.set(this.defaultAggregatedFile, defaultScenarios);
      }
    }

    return outputMap;
  }
}

export { StoryReporter };
