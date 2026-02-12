/**
 * Markdown Formatter - Layer 3.
 *
 * Transforms canonical TestRunResult into Markdown documentation.
 * Compatible with existing markdown output from framework reporters.
 */

import type { StoryStep, DocEntry } from "../types/story";
import type { TestRunResult, TestCaseResult, TestStatus } from "../types/test-result";
import type { MarkdownRenderers } from "../types/options";

/** Options for Markdown formatting */
export interface MarkdownOptions {
  /** Report title. Default: "User Stories" */
  title?: string;
  /** Include status icons on scenarios. Default: true */
  includeStatusIcons?: boolean;
  /** Include metadata table (date, version). Default: true */
  includeMetadata?: boolean;
  /** Include error details for failed scenarios. Default: true */
  includeErrors?: boolean;
  /** Scenario heading level. Default: 3 */
  scenarioHeadingLevel?: 2 | 3 | 4;
  /** Step rendering style. Default: "bullets" */
  stepStyle?: "bullets" | "gherkin";
  /** Group scenarios by. Default: "file" */
  groupBy?: "file" | "suite" | "none";
  /** Sort scenarios. Default: "source" */
  sortScenarios?: "alpha" | "source" | "none";
  /** Suite path separator. Default: " - " */
  suiteSeparator?: string;
  /** Include YAML front-matter for machine parsing. Default: false */
  includeFrontMatter?: boolean;
  /** Include summary table (counts, duration). Default: false */
  includeSummaryTable?: boolean;
  /** Base URL for source permalinks. E.g., "https://github.com/user/repo/blob" */
  permalinkBaseUrl?: string;
  /** URL template for ticket links. Use {ticket} as placeholder */
  ticketUrlTemplate?: string;
  /** Include source links when permalinkBaseUrl is set. Default: true */
  includeSourceLinks?: boolean;
  /** Custom renderers for doc entries */
  customRenderers?: MarkdownRenderers;
}

/** Resolved options with all defaults */
type ResolvedMarkdownOptions = {
  title: string;
  includeStatusIcons: boolean;
  includeMetadata: boolean;
  includeErrors: boolean;
  scenarioHeadingLevel: 2 | 3 | 4;
  stepStyle: "bullets" | "gherkin";
  groupBy: "file" | "suite" | "none";
  sortScenarios: "alpha" | "source" | "none";
  suiteSeparator: string;
  includeFrontMatter: boolean;
  includeSummaryTable: boolean;
  permalinkBaseUrl?: string;
  ticketUrlTemplate?: string;
  includeSourceLinks: boolean;
  customRenderers?: MarkdownRenderers;
};

/**
 * Markdown Formatter.
 *
 * Transforms TestRunResult into Markdown documentation that matches
 * the output format of existing framework reporters.
 */
export class MarkdownFormatter {
  private options: ResolvedMarkdownOptions;

  constructor(options: MarkdownOptions = {}) {
    this.options = {
      title: options.title ?? "User Stories",
      includeStatusIcons: options.includeStatusIcons ?? true,
      includeMetadata: options.includeMetadata ?? true,
      includeErrors: options.includeErrors ?? true,
      scenarioHeadingLevel: options.scenarioHeadingLevel ?? 3,
      stepStyle: options.stepStyle ?? "bullets",
      groupBy: options.groupBy ?? "file",
      sortScenarios: options.sortScenarios ?? "source",
      suiteSeparator: options.suiteSeparator ?? " - ",
      includeFrontMatter: options.includeFrontMatter ?? false,
      includeSummaryTable: options.includeSummaryTable ?? false,
      permalinkBaseUrl: options.permalinkBaseUrl,
      ticketUrlTemplate: options.ticketUrlTemplate,
      includeSourceLinks: options.includeSourceLinks ?? true,
      customRenderers: options.customRenderers,
    };
  }

  /**
   * Format a test run into Markdown.
   *
   * @param run - Canonical test run result
   * @returns Markdown string
   */
  format(run: TestRunResult): string {
    const lines: string[] = [];

    // Front-matter
    if (this.options.includeFrontMatter) {
      this.renderFrontMatter(lines, run);
    }

    // Title
    lines.push(`# ${this.options.title}`);
    lines.push("");

    // Metadata
    if (this.options.includeMetadata) {
      this.renderMetadata(lines, run);
      lines.push("");
    }

    // Summary table
    if (this.options.includeSummaryTable) {
      this.renderSummaryTable(lines, run);
      lines.push("");
    }

    // Render scenarios based on grouping
    switch (this.options.groupBy) {
      case "none":
        this.renderFlatList(lines, run.testCases);
        break;
      case "suite":
        this.renderBySuite(lines, run.testCases);
        break;
      case "file":
      default:
        this.renderByFile(lines, run.testCases);
        break;
    }

    // Custom footer
    if (this.options.customRenderers?.renderFooter) {
      const footer = this.options.customRenderers.renderFooter(run);
      if (footer) {
        lines.push("");
        lines.push(footer);
      }
    }

    return lines.join("\n").trimEnd();
  }

  /**
   * Render YAML front-matter.
   */
  private renderFrontMatter(lines: string[], run: TestRunResult): void {
    const data: Record<string, unknown> = {
      title: this.options.title,
      generatedAt: new Date(run.startedAtMs).toISOString(),
      durationMs: run.durationMs,
      scenarios: run.testCases.length,
      passed: run.testCases.filter((tc) => tc.status === "passed").length,
      failed: run.testCases.filter((tc) => tc.status === "failed").length,
      skipped: run.testCases.filter((tc) => tc.status === "skipped").length,
      pending: run.testCases.filter((tc) => tc.status === "pending").length,
    };

    if (run.packageVersion) data.version = run.packageVersion;
    if (run.gitSha) data.gitSha = run.gitSha.length > 7 ? run.gitSha.slice(0, 7) : run.gitSha;
    if (run.coverage) data.coverage = run.coverage;

    lines.push("---");
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (typeof value === "object") {
        lines.push(`${key}:`);
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          lines.push(`  ${k}: ${v}`);
        }
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    lines.push("---");
    lines.push("");
  }

  /**
   * Render summary table.
   */
  private renderSummaryTable(lines: string[], run: TestRunResult): void {
    const totalScenarios = run.testCases.length;
    const totalSteps = run.testCases.reduce((acc, tc) => acc + tc.story.steps.length, 0);
    const passed = run.testCases.filter((tc) => tc.status === "passed").length;
    const failed = run.testCases.filter((tc) => tc.status === "failed").length;
    const skipped = run.testCases.filter((tc) => tc.status === "skipped").length;
    const pending = run.testCases.filter((tc) => tc.status === "pending").length;

    lines.push("| Scenarios | Steps | Passed | Failed | Skipped | Pending | Duration |");
    lines.push("| ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
    lines.push(`| ${totalScenarios} | ${totalSteps} | ${passed} | ${failed} | ${skipped} | ${pending} | ${this.formatDuration(run.durationMs)} |`);

    // Coverage summary if available
    if (run.coverage) {
      lines.push("");
      lines.push("| Coverage | % |");
      lines.push("| --- | ---: |");
      if (run.coverage.statementsPct !== undefined) {
        lines.push(`| Statements | ${run.coverage.statementsPct}% |`);
      }
      if (run.coverage.branchesPct !== undefined) {
        lines.push(`| Branches | ${run.coverage.branchesPct}% |`);
      }
      if (run.coverage.functionsPct !== undefined) {
        lines.push(`| Functions | ${run.coverage.functionsPct}% |`);
      }
      if (run.coverage.linesPct !== undefined) {
        lines.push(`| Lines | ${run.coverage.linesPct}% |`);
      }
    }
  }

  /**
   * Format duration in human-readable form.
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * Render metadata table.
   */
  private renderMetadata(lines: string[], run: TestRunResult): void {
    const rows: Array<[string, string]> = [];

    const startDate = new Date(run.startedAtMs);
    rows.push(["Date", startDate.toISOString()]);

    if (run.packageVersion) {
      rows.push(["Version", run.packageVersion]);
    }

    if (run.gitSha) {
      const shortSha = run.gitSha.length > 7 ? run.gitSha.slice(0, 7) : run.gitSha;
      rows.push(["Git SHA", shortSha]);
    }

    if (rows.length > 0) {
      lines.push("| Key | Value |");
      lines.push("| --- | --- |");
      for (const [key, value] of rows) {
        lines.push(`| ${key} | ${value} |`);
      }
    }
  }

  /**
   * Render scenarios grouped by file.
   */
  private renderByFile(lines: string[], testCases: TestCaseResult[]): void {
    const byFile = groupBy(testCases, (tc) => tc.sourceFile);

    for (const [file, fileTestCases] of byFile) {
      lines.push(`## ${file}`);
      lines.push("");

      // Group by suite path within file
      this.renderSuiteGroups(lines, fileTestCases, 3);
    }
  }

  /**
   * Render scenarios grouped by suite path.
   */
  private renderBySuite(lines: string[], testCases: TestCaseResult[]): void {
    this.renderSuiteGroups(lines, testCases, 2);
  }

  /**
   * Render suite groups.
   */
  private renderSuiteGroups(
    lines: string[],
    testCases: TestCaseResult[],
    baseLevel: number
  ): void {
    const bySuite = groupBy(testCases, (tc) =>
      tc.titlePath.join(this.options.suiteSeparator)
    );

    // Sort suite groups
    const sortedSuites = this.sortSuiteGroups([...bySuite.entries()]);

    for (const [suitePath, suiteTestCases] of sortedSuites) {
      if (suitePath) {
        lines.push(`${"#".repeat(baseLevel)} ${suitePath}`);
        lines.push("");
      }

      const sorted = this.sortScenarios(suiteTestCases);
      for (const tc of sorted) {
        this.renderScenario(lines, tc);
      }
    }
  }

  /**
   * Render flat list of scenarios.
   */
  private renderFlatList(lines: string[], testCases: TestCaseResult[]): void {
    const sorted = this.sortScenarios(testCases);
    for (const tc of sorted) {
      this.renderScenario(lines, tc);
    }
  }

  /**
   * Render a single scenario.
   */
  private renderScenario(lines: string[], tc: TestCaseResult): void {
    // Check for custom scenario header renderer
    if (this.options.customRenderers?.renderScenarioHeader) {
      const custom = this.options.customRenderers.renderScenarioHeader(tc);
      if (custom !== null) {
        lines.push(custom);
        lines.push("");
        // Still render steps and docs after custom header
        this.renderScenarioBody(lines, tc);
        return;
      }
    }

    const headingPrefix = "#".repeat(this.options.scenarioHeadingLevel);

    // Status icon
    let icon = "";
    if (this.options.includeStatusIcons) {
      icon = this.getStatusIcon(tc.status) + " ";
    }

    // Scenario heading
    lines.push(`${headingPrefix} ${icon}${tc.story.scenario}`);

    // Source link
    if (this.options.includeSourceLinks && this.options.permalinkBaseUrl && tc.sourceFile !== "unknown") {
      const permalink = this.buildPermalink(tc);
      lines.push(`Source: [${tc.sourceFile}](${permalink})`);
    }

    // Tags and tickets
    const meta: string[] = [];
    if (tc.tags.length > 0) {
      meta.push(`Tags: ${tc.tags.map((t) => `\`${t}\``).join(", ")}`);
    }
    if (tc.story.tickets && tc.story.tickets.length > 0) {
      const ticketTemplate = this.options.ticketUrlTemplate;
      if (ticketTemplate) {
        const ticketLinks = tc.story.tickets.map(
          (t) => `[${t}](${ticketTemplate.replace("{ticket}", t)})`
        );
        meta.push(`Tickets: ${ticketLinks.join(", ")}`);
      } else {
        meta.push(`Tickets: ${tc.story.tickets.map((t) => `\`${t}\``).join(", ")}`);
      }
    }
    if (meta.length > 0) {
      lines.push(meta.join(" | "));
    }

    lines.push("");

    this.renderScenarioBody(lines, tc);
  }

  /**
   * Render scenario body (docs, steps, errors).
   */
  private renderScenarioBody(lines: string[], tc: TestCaseResult): void {
    // Story-level docs
    if (tc.story.docs && tc.story.docs.length > 0) {
      for (const doc of tc.story.docs) {
        this.renderDocEntry(lines, doc);
      }
    }

    // Steps
    for (const step of tc.story.steps) {
      this.renderStep(lines, step);
    }

    // Error
    if (tc.status === "failed" && tc.errorMessage && this.options.includeErrors) {
      lines.push("**Failure**");
      lines.push("");
      lines.push("```text");
      lines.push(tc.errorMessage);
      if (tc.errorStack) {
        lines.push("");
        lines.push(tc.errorStack);
      }
      lines.push("```");
      lines.push("");
    }

    lines.push("");
  }

  /**
   * Build permalink URL for a test case.
   */
  private buildPermalink(tc: TestCaseResult): string {
    const base = this.options.permalinkBaseUrl!.replace(/\/$/, "");
    const file = tc.sourceFile;
    const line = tc.sourceLine > 0 ? `#L${tc.sourceLine}` : "";
    return `${base}/${file}${line}`;
  }

  /**
   * Render a step.
   */
  private renderStep(lines: string[], step: StoryStep): void {
    // Check for custom step renderer
    if (this.options.customRenderers?.renderStep) {
      const custom = this.options.customRenderers.renderStep(step);
      if (custom !== null) {
        lines.push(custom);
        // Still render step docs
        if (step.docs && step.docs.length > 0) {
          const indent = this.options.stepStyle === "gherkin" ? "" : "    ";
          for (const doc of step.docs) {
            this.renderDocEntry(lines, doc, indent);
          }
        }
        return;
      }
    }

    // Mode indicator
    let modeIndicator = "";
    if (step.mode === "skip") {
      modeIndicator = " _(skipped)_";
    } else if (step.mode === "todo") {
      modeIndicator = " _(todo)_";
    } else if (step.mode === "fails") {
      modeIndicator = " _(expected to fail)_";
    }

    if (this.options.stepStyle === "gherkin") {
      lines.push(`**${step.keyword}** ${step.text}${modeIndicator}`);
    } else {
      lines.push(`- **${step.keyword}** ${step.text}${modeIndicator}`);
    }

    // Render step docs
    if (step.docs && step.docs.length > 0) {
      const indent = this.options.stepStyle === "gherkin" ? "" : "    ";
      for (const doc of step.docs) {
        this.renderDocEntry(lines, doc, indent);
      }
    }
  }

  /**
   * Render a documentation entry.
   */
  private renderDocEntry(lines: string[], entry: DocEntry, indent = ""): void {
    // Check for custom doc entry renderer
    if (this.options.customRenderers?.renderDocEntry) {
      const custom = this.options.customRenderers.renderDocEntry(entry);
      if (custom !== null) {
        lines.push(`${indent}${custom}`);
        return;
      }
    }

    switch (entry.kind) {
      case "note":
        lines.push(`${indent}> ${entry.text}`);
        break;

      case "tag":
        lines.push(`${indent}${entry.names.map((n) => `\`${n}\``).join(" ")}`);
        break;

      case "kv": {
        const val = typeof entry.value === "string"
          ? entry.value
          : JSON.stringify(entry.value);
        lines.push(`${indent}- **${entry.label}:** ${val}`);
        break;
      }

      case "code":
        if (entry.label) {
          lines.push(`${indent}**${entry.label}**`);
          lines.push(`${indent}`);
        }
        lines.push(`${indent}\`\`\`${entry.lang ?? ""}`);
        for (const line of (entry.content ?? "").split("\n")) {
          lines.push(`${indent}${line}`);
        }
        lines.push(`${indent}\`\`\``);
        lines.push(`${indent}`);
        break;

      case "table":
        if (entry.label) {
          lines.push(`${indent}**${entry.label}**`);
          lines.push(`${indent}`);
        }
        lines.push(`${indent}| ${entry.columns.join(" | ")} |`);
        lines.push(`${indent}| ${entry.columns.map(() => "---").join(" | ")} |`);
        for (const row of entry.rows) {
          lines.push(`${indent}| ${row.join(" | ")} |`);
        }
        lines.push(`${indent}`);
        break;

      case "link":
        lines.push(`${indent}[${entry.label}](${entry.url})`);
        break;

      case "section":
        lines.push(`${indent}**${entry.title}**`);
        lines.push(`${indent}`);
        for (const line of (entry.markdown ?? "").split("\n")) {
          lines.push(`${indent}${line}`);
        }
        lines.push(`${indent}`);
        break;

      case "mermaid":
        if (entry.title) {
          lines.push(`${indent}**${entry.title}**`);
        }
        lines.push(`${indent}\`\`\`mermaid`);
        for (const line of (entry.code ?? "").split("\n")) {
          lines.push(`${indent}${line}`);
        }
        lines.push(`${indent}\`\`\``);
        break;

      case "screenshot":
        lines.push(`${indent}![${entry.alt ?? "Screenshot"}](${entry.path})`);
        break;

      case "custom":
        lines.push(`${indent}**[${entry.type}]**`);
        lines.push(`${indent}`);
        lines.push(`${indent}\`\`\`json`);
        for (const line of JSON.stringify(entry.data ?? null, null, 2).split("\n")) {
          lines.push(`${indent}${line}`);
        }
        lines.push(`${indent}\`\`\``);
        lines.push(`${indent}`);
        break;
    }
  }

  /**
   * Get status icon for a status.
   */
  private getStatusIcon(status: TestStatus): string {
    switch (status) {
      case "passed":
        return "✅";
      case "failed":
        return "❌";
      case "skipped":
        return "⏩";
      case "pending":
        return "📝";
      default:
        return "⚠️";
    }
  }

  /**
   * Sort scenarios based on options.
   */
  private sortScenarios(testCases: TestCaseResult[]): TestCaseResult[] {
    if (this.options.sortScenarios === "alpha") {
      return [...testCases].sort((a, b) =>
        a.story.scenario.localeCompare(b.story.scenario)
      );
    }
    if (this.options.sortScenarios === "source") {
      return [...testCases].sort(
        (a, b) => (a.story.sourceOrder ?? 0) - (b.story.sourceOrder ?? 0)
      );
    }
    return testCases;
  }

  /**
   * Sort suite groups.
   */
  private sortSuiteGroups(
    entries: [string, TestCaseResult[]][]
  ): [string, TestCaseResult[]][] {
    if (this.options.sortScenarios === "alpha") {
      return entries.sort(([a], [b]) => a.localeCompare(b));
    }
    if (this.options.sortScenarios === "source") {
      return entries.sort(([, a], [, b]) => {
        const minA = Math.min(...a.map((s) => s.story.sourceOrder ?? Infinity));
        const minB = Math.min(...b.map((s) => s.story.sourceOrder ?? Infinity));
        return minA - minB;
      });
    }
    return entries;
  }
}

/**
 * Group array items by a key function.
 */
function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}
