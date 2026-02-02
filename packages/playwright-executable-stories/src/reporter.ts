/**
 * Playwright reporter that reads story-docs annotations from tests and writes Markdown user-story docs.
 * Ports useful options from vitest-executable-stories (metadata, front-matter, JSON, filters, etc.).
 */
import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";
import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import picomatch from "picomatch";
import type { StoryMeta, StoryStep, DocEntry, DocPhase } from "./bdd.js";
import { STORY_ANNOTATION_TYPE, STORY_RUNTIME_DOC_ANNOTATION_TYPE } from "./bdd.js";

export interface OutputRule {
  /** Glob pattern(s) to match test files. E.g. "src/features/**.story.spec.ts" */
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

/** Custom renderer for doc.custom() entries, keyed by type in reporter options. */
export type CustomDocRenderer = (
  entry: { kind: "custom"; type: string; data: unknown; phase: DocPhase },
  lines: string[],
  indent: string,
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
   * - string: single aggregated file path
   * - OutputRule[]: array of rules for different paths
   * If omitted, defaults to colocated output next to each test file.
   */
  output?: string | OutputRule[];
  /** Base URL for source links (e.g. GitHub blob). If set, adds "Source: [file](url)" under each scenario. */
  permalinkBaseUrl?: string;
  /** When GITHUB_ACTIONS, append report to job summary via @actions/core. Default: true */
  enableGithubActionsSummary?: boolean;
  /** Add a summary table (start time, duration, scenario/step counts, passed/failed/skipped). Default: false */
  includeSummaryTable?: boolean;
  /** Include a metadata block (date, package version). Default: true */
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
  /** How to group scenarios. Default: "file" */
  groupBy?: "file" | "none";
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
  fixme: number;
  todo: number;
  durationMs: number;
}

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
const TEST_EXTENSIONS = [".story.spec.ts", ".story.spec.tsx", ".spec.ts", ".spec.tsx", ".test.ts", ".test.tsx", ".spec.js", ".test.js"];

export default class StoryReporter implements Reporter {
  private options: ResolvedOptions;
  private outputRules: OutputRule[];
  private defaultAggregatedFile: string;
  private config: FullConfig | undefined;
  private startTime: number = 0;
  private packageVersion: string | undefined;
  private gitSha: string | undefined;
  private coverageSummary: CoverageSummary | undefined;
  private scenarios = new Map<string, ScenarioWithMeta>();

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
      includeEmpty: options.includeEmpty ?? true,
      sortFiles: options.sortFiles ?? "alpha",
      sortScenarios: options.sortScenarios ?? "alpha",
      filter: options.filter ?? {},
      includeSourceLinks: options.includeSourceLinks ?? true,
      ticketUrlTemplate: options.ticketUrlTemplate,
      customRenderers: options.customRenderers,
    };

    if (typeof options.output === "string") {
      this.outputRules = [{ include: "**/*", mode: "aggregated", outputFile: options.output }];
    } else if (Array.isArray(options.output)) {
      this.outputRules = options.output;
    } else {
      this.outputRules = [{ include: "**/*", mode: "colocated" }];
    }

    this.defaultAggregatedFile = typeof options.output === "string"
      ? options.output
      : "docs/user-stories.md";
  }

  onBegin(config: FullConfig, _suite: Suite): void {
    this.config = config;
    this.startTime = Date.now();
    this.scenarios.clear();
    if (this.options.includeMetadata && this.options.metadata.packageVersion) {
      this.packageVersion = this.readPackageVersion();
    }
    if (this.options.includeMetadata && this.options.metadata.gitSha) {
      this.gitSha = this.readGitSha();
    }
    if (this.options.coverage.include) {
      this.coverageSummary = this.readCoverageSummary();
    }
  }

  private getOutputRoot(): string {
    return this.config?.configFile
      ? path.dirname(this.config.configFile)
      : (this.config?.rootDir ?? process.cwd());
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const meta = this.getStoryMetaFromResult(result);
    if (!meta?.scenario || !Array.isArray(meta.steps)) return;

    const metaWithRuntime = this.mergeRuntimeDocAnnotations(
      { ...meta, steps: meta.steps.map((s) => ({ ...s, docs: s.docs ? [...s.docs] : [] })) },
      result,
    );

    const root = this.getOutputRoot();
    const cwd = this.config?.rootDir ?? process.cwd();
    // Prefer sourceFile from story annotation (caller spec file); test.location.file points at bdd.ts
    const fileFromMeta = metaWithRuntime.sourceFile;
    const fileFromTest = test.location?.file;
    const absFile = fileFromMeta
      ? (path.isAbsolute(fileFromMeta) ? fileFromMeta : path.resolve(cwd, fileFromMeta))
      : fileFromTest
        ? (path.isAbsolute(fileFromTest) ? fileFromTest : path.resolve(cwd, fileFromTest))
        : "";
    const sourcePath = absFile ? path.relative(root, absFile) : "";

    const key = `${sourcePath}::${metaWithRuntime.scenario}`;
    const scenarioId = this.createScenarioId(sourcePath, metaWithRuntime.scenario);
    const status = result.status;
    const passed = status === "passed" ? 1 : 0;
    const failed = status === "failed" || status === "timedOut" ? 1 : 0;
    const skipped = status === "skipped" || status === "interrupted" ? 1 : 0;
    const durationMs = typeof result.duration === "number" ? result.duration : 0;

    const existing = this.scenarios.get(key);
    if (existing) {
      existing.passed += passed;
      existing.failed += failed;
      existing.skipped += skipped;
      existing.durationMs += durationMs;
      this.mergeStepDocsInto(existing.meta, metaWithRuntime);
    } else {
      this.scenarios.set(key, {
        meta: metaWithRuntime,
        sourceFile: sourcePath || undefined,
        scenarioId,
        passed,
        failed,
        skipped,
        fixme: 0,
        todo: 0,
        durationMs,
      });
    }
  }

  /** Merge step docs from source meta into target meta (accumulates across steps). */
  private mergeStepDocsInto(target: StoryMeta, source: StoryMeta): void {
    for (let i = 0; i < source.steps.length; i++) {
      if (source.steps[i].docs?.length && target.steps[i]) {
        target.steps[i].docs ??= [];
        target.steps[i].docs!.push(...source.steps[i].docs!);
      }
    }
  }

  onEnd(_result: FullResult): void {
    // Count fixme/todo/skip from step modes for accurate status
    for (const scenario of this.scenarios.values()) {
      const fixmeSteps = scenario.meta.steps.filter((s) => s.mode === "fixme").length;
      const todoSteps = scenario.meta.steps.filter((s) => s.mode === "todo").length;
      const skipSteps = scenario.meta.steps.filter((s) => s.mode === "skip").length;
      scenario.fixme = fixmeSteps;
      scenario.todo = todoSteps;
      if (skipSteps > 0 && scenario.skipped === 0) {
        scenario.skipped = skipSteps;
      }
    }

    const permalinkBaseUrl =
      this.options.permalinkBaseUrl ?? this.buildGithubActionsPermalinkBase();
    const durationSec = (Date.now() - this.startTime) / 1000;
    const startTime = new Date(this.startTime);

    const filteredScenarios = this.applyFilters(this.scenarios);

    const outputMap = this.routeScenariosToOutputs(filteredScenarios);

    if (outputMap.size === 0 && this.options.includeEmpty) {
      outputMap.set(this.defaultAggregatedFile, []);
    }

    const allMarkdownParts: string[] = [];

    const outputRoot = this.getOutputRoot();

    for (const [outputPath, outputScenarios] of outputMap) {
      if (!this.options.includeEmpty && outputScenarios.length === 0) continue;

      const md = this.renderMarkdown(
        outputScenarios,
        outputPath,
        permalinkBaseUrl,
        startTime,
        durationSec,
      );

      const outFile = path.isAbsolute(outputPath)
        ? outputPath
        : path.resolve(outputRoot, outputPath);
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, md + "\n", "utf8");

      allMarkdownParts.push(md);

      if (this.options.includeJson) {
        const jsonOutFile = this.getJsonOutputPath(outFile, outputPath);
        const json = this.renderJsonReport(outputScenarios, outputPath, startTime, durationSec);
        fs.mkdirSync(path.dirname(jsonOutFile), { recursive: true });
        fs.writeFileSync(jsonOutFile, JSON.stringify(json, null, 2) + "\n", "utf8");
      }
    }

    if (
      process.env.GITHUB_ACTIONS === "true" &&
      this.options.enableGithubActionsSummary
    ) {
      const combinedMd = allMarkdownParts.join("\n\n---\n\n");
      this.appendGithubSummary(combinedMd).catch(() => {});
    }
  }

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
      const totalSteps = outputScenarios.reduce((acc, s) => acc + s.meta.steps.length, 0);
      const totalPassed = outputScenarios.reduce((acc, s) => acc + s.passed, 0);
      const totalFailed = outputScenarios.reduce((acc, s) => acc + s.failed, 0);
      const totalSkipped = outputScenarios.reduce((acc, s) => acc + s.skipped, 0);
      const totalDurationMs = outputScenarios.reduce((acc, s) => acc + s.durationMs, 0);

      lines.push("| Start time | Duration |");
      lines.push("| --- | ---: |");
      lines.push(`| ${startTime.toLocaleString().replace(/\u202F/g, " ")} | ${durationSec.toFixed(2)} s |`);
      lines.push("");

      if (this.options.includeDurations) {
        lines.push("| Scenarios | Steps | Passed | Failed | Skipped | Duration |");
        lines.push("| --- | ---: | ---: | ---: | ---: | ---: |");
        lines.push(
          `| ${totalScenarios} | ${totalSteps} | ${totalPassed} | ${totalFailed} | ${totalSkipped} | ${this.formatDuration(totalDurationMs)} |`,
        );
      } else {
        lines.push("| Scenarios | Steps | Passed | Failed | Skipped |");
        lines.push("| --- | ---: | ---: | ---: | ---: |");
        lines.push(
          `| ${totalScenarios} | ${totalSteps} | ${totalPassed} | ${totalFailed} | ${totalSkipped} |`,
        );
      }

      lines.push("");
    }

    const groupBy = this.options.groupBy;
    const fileHeadingLevel = 2;
    const scenarioHeadingLevel = this.options.scenarioHeadingLevel ?? (groupBy === "file" ? 3 : 2);
    const scenarioHeading = "#".repeat(scenarioHeadingLevel);

    const uniqueSourceFiles = new Set(outputScenarios.map((s) => s.sourceFile ?? "unknown"));
    const isColocated = uniqueSourceFiles.size === 1 && this.isColocatedOutput(outputPath);

    if (isColocated || groupBy === "none") {
      const sorted = this.sortScenarios(outputScenarios);
      for (const scenario of sorted) {
        this.renderScenario(lines, scenario, scenarioHeading, isColocated ? undefined : permalinkBaseUrl);
      }
    } else {
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

      const sortedFiles = this.sortFiles([...byFile.keys()], byFile);

      for (const file of sortedFiles) {
        const fileScenarios = byFile.get(file)!;
        lines.push(`${"#".repeat(fileHeadingLevel)} ${file}`);
        if (this.options.includeSourceLinks && permalinkBaseUrl && file !== "unknown") {
          const href = permalinkBaseUrl.replace(/\/$/, "") + "/" + file;
          lines.push(`Source: [${file}](${href})`);
        }
        lines.push("");

        const sorted = this.sortScenarios(fileScenarios);
        for (const scenario of sorted) {
          this.renderScenario(lines, scenario, scenarioHeading, undefined);
        }
      }
    }

    return lines.join("\n").trimEnd() || "_No scenarios found._";
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
    const { meta, sourceFile, passed, failed, skipped, todo, fixme, durationMs, scenarioId } = scenario;
    return {
      id: scenarioId,
      title: meta.scenario,
      sourceFile,
      tags: meta.tags ?? [],
      tickets: meta.tickets ?? [],
      status: { passed, failed, skipped, todo, fixme },
      durationMs,
      steps: meta.steps.map((step) => ({
        keyword: step.keyword,
        text: step.text,
        mode: step.mode ?? "normal",
        docs: this.filterDocs(step.docs),
      })),
    };
  }

  private isColocatedOutput(outputPath: string): boolean {
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

  private getJsonOutputPath(outFile: string, outputPath: string): string {
    if (!this.isColocatedOutput(outputPath) && this.options.json.outputFile) {
      return path.isAbsolute(this.options.json.outputFile)
        ? this.options.json.outputFile
        : path.resolve(this.getOutputRoot(), this.options.json.outputFile);
    }
    if (outFile.endsWith(".md")) {
      return outFile.replace(/\.md$/i, ".json");
    }
    return outFile + ".json";
  }

  private renderScenario(
    lines: string[],
    scenario: ScenarioWithMeta,
    headingPrefix: string,
    permalinkBaseUrl: string | undefined,
  ): void {
    const { meta, sourceFile, failed, skipped, fixme, todo, passed, durationMs, scenarioId } = scenario;
    const includeStatus = this.options.includeStatus;
    const totalSteps = meta.steps.length;

    let icon = "";
    if (includeStatus && totalSteps > 0) {
      if (failed > 0) {
        icon = "❌ ";
      } else if (passed === totalSteps) {
        icon = "✅ ";
      } else if (fixme === totalSteps || todo === totalSteps) {
        icon = "📝 ";
      } else if (skipped === totalSteps) {
        icon = "⏩ ";
      } else {
        icon = "⚠️ ";
      }
    }

    const durationSuffix = this.options.includeDurations && durationMs > 0
      ? ` _(${this.formatDuration(durationMs)})_`
      : "";
    lines.push(`${headingPrefix} ${icon}${meta.scenario}${durationSuffix}`);
    lines.push(`<!-- scenarioId: ${scenarioId} -->`);

    if (this.options.includeSourceLinks && permalinkBaseUrl && sourceFile) {
      const href = permalinkBaseUrl.replace(/\/$/, "") + "/" + sourceFile;
      lines.push(`Source: [${sourceFile}](${href})`);
    }

    if (meta.tags && meta.tags.length > 0) {
      lines.push(`Tags: ${meta.tags.map((t) => `\`${t}\``).join(", ")}`);
    }

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

    for (const step of meta.steps) {
      this.renderStep(lines, step);
    }

    lines.push("");
  }

  private renderStep(lines: string[], step: StoryStep): void {
    const { keyword, text, mode, docs } = step;
    const stepStyle = this.options.stepStyle;

    let modeIndicator = "";
    if (mode === "skip") {
      modeIndicator = " _(skipped)_";
    } else if (mode === "fixme") {
      modeIndicator = " _(fixme)_";
    } else if (mode === "todo") {
      modeIndicator = " _(todo)_";
    } else if (mode === "fail") {
      modeIndicator = " _(expected to fail)_";
    } else if (mode === "slow") {
      modeIndicator = " _(slow)_";
    }

    if (stepStyle === "gherkin") {
      lines.push(`**${keyword}** ${text}${modeIndicator}`);
    } else {
      lines.push(`- **${keyword}** ${text}${modeIndicator}`);
    }

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
          renderer(entry, lines, indent);
        } else {
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
    const root = this.getOutputRoot();
    if (!server || !repo || !sha || !workspace) return undefined;
    const subtree = path.relative(workspace, root);
    const suffix = subtree && !subtree.endsWith("/") ? "/" : "";
    return `${server}/${repo}/blob/${sha}/${subtree}${suffix}`;
  }

  private readPackageVersion(): string | undefined {
    try {
      const root = this.getOutputRoot();
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

    const root = this.getOutputRoot();
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
    const root = this.getOutputRoot();
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
      const root = this.getOutputRoot();
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
      const { summary } = await import("@actions/core");
      summary.addRaw(reportText);
      await summary.write();
    } catch {
      // @actions/core not available or not in Actions
    }
  }

  private getStoryMetaFromResult(result: TestResult): StoryMeta | undefined {
    const annotations = result.annotations ?? [];
    const storyAnnotation = annotations.find(
      (a: { type?: string; description?: string }) => a.type === STORY_ANNOTATION_TYPE,
    );
    if (!storyAnnotation?.description) return undefined;
    try {
      return JSON.parse(storyAnnotation.description) as StoryMeta;
    } catch {
      return undefined;
    }
  }

  /** Merge runtime doc entries from result.annotations (story-docs-runtime) into meta.steps[].docs */
  private mergeRuntimeDocAnnotations(meta: StoryMeta, result: TestResult): StoryMeta {
    const annotations = result.annotations ?? [];
    for (const a of annotations) {
      const ann = a as { type?: string; description?: string };
      if (ann.type !== STORY_RUNTIME_DOC_ANNOTATION_TYPE || !ann.description) continue;
      try {
        const { stepIndex, entry } = JSON.parse(ann.description) as { stepIndex: number; entry: DocEntry };
        if (stepIndex >= 0 && meta.steps[stepIndex]) {
          meta.steps[stepIndex].docs ??= [];
          meta.steps[stepIndex].docs!.push(entry);
        }
      } catch {
        // ignore parse errors
      }
    }
    return meta;
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
   * Behavior is explicit:
   * - If output rules are provided, only those rules apply. Unmatched files are ignored.
   * - If no output rules are provided, a default colocated rule is used.
   */
  private routeScenariosToOutputs(
    scenarios: Map<string, ScenarioWithMeta>,
  ): Map<string, ScenarioWithMeta[]> {
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

    const outputMap = new Map<string, ScenarioWithMeta[]>();
    const defaultScenarios: ScenarioWithMeta[] = [];

    for (const [sourceFile, fileScenarios] of bySourceFile) {
      const rule = this.findMatchingRule(sourceFile);

      if (!rule) {
        if (this.outputRules.length === 0) {
          defaultScenarios.push(...fileScenarios);
        }
        continue;
      }

      let outputPath: string;
      if (rule.mode === "colocated") {
        outputPath = this.getColocatedPath(sourceFile, rule.extension ?? ".docs.md");
      } else {
        outputPath = rule.outputFile ?? this.defaultAggregatedFile;
      }

      const existing = outputMap.get(outputPath);
      if (existing) {
        existing.push(...fileScenarios);
      } else {
        outputMap.set(outputPath, [...fileScenarios]);
      }
    }

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
