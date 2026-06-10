/**
 * Confluence (ADF) Formatter — Layer 3.
 *
 * Emits Atlassian Document Format JSON. Suitable for Confluence pages
 * and Jira issue descriptions via the REST API. Built directly from
 * TestRunResult so code blocks, tables, links, and mermaid all round-trip
 * with higher fidelity than converting markdown → ADF.
 */

import type { StoryStep, DocEntry } from "../types/story";
import type { TestRunResult, TestCaseResult, TestStatus } from "../types/test-result";

/** Options for ConfluenceFormatter */
export interface ConfluenceFormatterOptions {
  /** Page title. Default: "User Stories" */
  title?: string;
  /** Include status icons (emoji) in scenario headings. Default: true */
  includeStatusIcons?: boolean;
  /** Include metadata table (date, version). Default: true */
  includeMetadata?: boolean;
  /** Include summary table (counts, duration). Default: true */
  includeSummaryTable?: boolean;
  /** Include error details for failed scenarios. Default: true */
  includeErrors?: boolean;
  /** Scenario heading level (1-6). Default: 3 */
  scenarioHeadingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Group scenarios by. Default: "file" */
  groupBy?: "file" | "suite" | "none";
  /** Sort scenarios. Default: "source" */
  sortScenarios?: "alpha" | "source" | "none";
  /** Pretty-print JSON output. Default: true */
  pretty?: boolean;
  /** Base URL for source permalinks (Git). Rendered as link marks */
  permalinkBaseUrl?: string;
  /** URL template for ticket links. Use {ticket} as placeholder */
  ticketUrlTemplate?: string;
}

type ResolvedOptions = Required<
  Omit<ConfluenceFormatterOptions, "permalinkBaseUrl" | "ticketUrlTemplate">
> & {
  permalinkBaseUrl?: string;
  ticketUrlTemplate?: string;
};

// ============================================================================
// ADF node types (minimal — just what we emit)
// ============================================================================

interface AdfMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  marks?: AdfMark[];
  text?: string;
  /** Only on the root doc node */
  version?: number;
}

/**
 * Confluence / Atlassian Document Format formatter.
 *
 * Emits a top-level `{ version: 1, type: "doc", content: [...] }` tree that
 * can be posted to the Confluence or Jira REST API.
 */
export class ConfluenceFormatter {
  private options: ResolvedOptions;

  constructor(options: ConfluenceFormatterOptions = {}) {
    this.options = {
      title: options.title ?? "User Stories",
      includeStatusIcons: options.includeStatusIcons ?? true,
      includeMetadata: options.includeMetadata ?? true,
      includeSummaryTable: options.includeSummaryTable ?? true,
      includeErrors: options.includeErrors ?? true,
      scenarioHeadingLevel: options.scenarioHeadingLevel ?? 3,
      groupBy: options.groupBy ?? "file",
      sortScenarios: options.sortScenarios ?? "source",
      pretty: options.pretty ?? true,
      permalinkBaseUrl: options.permalinkBaseUrl,
      ticketUrlTemplate: options.ticketUrlTemplate,
    };
  }

  /** Build the ADF document tree. Returns the JS object (not stringified). */
  formatToAdf(run: TestRunResult): AdfNode {
    const content: AdfNode[] = [];

    content.push(heading(1, [text(this.options.title)]));

    if (this.options.includeMetadata) {
      const metaTable = this.renderMetadataTable(run);
      if (metaTable) content.push(metaTable);
    }

    if (this.options.includeSummaryTable) {
      content.push(this.renderSummaryTable(run));
    }

    switch (this.options.groupBy) {
      case "none":
        this.renderFlat(content, run.testCases);
        break;
      case "suite":
        this.renderBySuite(content, run.testCases);
        break;
      case "file":
      default:
        this.renderByFile(content, run.testCases);
        break;
    }

    return { version: 1, type: "doc", content };
  }

  /** Format a test run as an ADF JSON string. */
  format(run: TestRunResult): string {
    const adf = this.formatToAdf(run);
    return this.options.pretty
      ? JSON.stringify(adf, null, 2)
      : JSON.stringify(adf);
  }

  // --------------------------------------------------------------------------
  // Metadata / summary tables
  // --------------------------------------------------------------------------

  private renderMetadataTable(run: TestRunResult): AdfNode | null {
    const rows: Array<[string, string]> = [];
    rows.push(["Date", new Date(run.startedAtMs).toISOString()]);
    if (run.packageVersion) rows.push(["Version", run.packageVersion]);
    if (run.gitSha) {
      const shortSha = run.gitSha.length > 7 ? run.gitSha.slice(0, 7) : run.gitSha;
      rows.push(["Git SHA", shortSha]);
    }
    if (rows.length === 0) return null;
    return table([
      tableRow([tableHeader("Key"), tableHeader("Value")]),
      ...rows.map(([k, v]) => tableRow([tableCell(k), tableCell(v)])),
    ]);
  }

  private renderSummaryTable(run: TestRunResult): AdfNode {
    const total = run.testCases.length;
    const steps = run.testCases.reduce(
      (acc, tc) => acc + tc.story.steps.length,
      0,
    );
    const passed = run.testCases.filter((tc) => tc.status === "passed").length;
    const failed = run.testCases.filter((tc) => tc.status === "failed").length;
    const skipped = run.testCases.filter((tc) => tc.status === "skipped").length;
    const pending = run.testCases.filter((tc) => tc.status === "pending").length;

    return table([
      tableRow([
        tableHeader("Scenarios"),
        tableHeader("Steps"),
        tableHeader("Passed"),
        tableHeader("Failed"),
        tableHeader("Skipped"),
        tableHeader("Pending"),
        tableHeader("Duration"),
      ]),
      tableRow([
        tableCell(String(total)),
        tableCell(String(steps)),
        tableCell(String(passed)),
        tableCell(String(failed)),
        tableCell(String(skipped)),
        tableCell(String(pending)),
        tableCell(formatDuration(run.durationMs)),
      ]),
    ]);
  }

  // --------------------------------------------------------------------------
  // Grouping
  // --------------------------------------------------------------------------

  private renderByFile(content: AdfNode[], testCases: TestCaseResult[]): void {
    const byFile = groupBy(testCases, (tc) => tc.sourceFile);
    for (const [file, fileCases] of byFile) {
      content.push(heading(2, [codeInline(file)]));
      this.renderSuiteGroups(content, fileCases, 3);
    }
  }

  private renderBySuite(content: AdfNode[], testCases: TestCaseResult[]): void {
    this.renderSuiteGroups(content, testCases, 2);
  }

  private renderFlat(content: AdfNode[], testCases: TestCaseResult[]): void {
    const sorted = this.sortCases(testCases);
    for (const tc of sorted) this.renderScenario(content, tc);
  }

  private renderSuiteGroups(
    content: AdfNode[],
    testCases: TestCaseResult[],
    baseLevel: number,
  ): void {
    const bySuite = groupBy(testCases, (tc) => tc.titlePath.join(" - "));
    const entries = this.sortSuiteGroups([...bySuite.entries()]);
    for (const [suitePath, cases] of entries) {
      if (suitePath) {
        content.push(
          heading(clampHeadingLevel(baseLevel), [text(suitePath)]),
        );
      }
      for (const tc of this.sortCases(cases)) {
        this.renderScenario(content, tc);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Scenario
  // --------------------------------------------------------------------------

  private renderScenario(content: AdfNode[], tc: TestCaseResult): void {
    const level = clampHeadingLevel(this.options.scenarioHeadingLevel);
    const headingNodes: AdfNode[] = [];
    if (this.options.includeStatusIcons) {
      headingNodes.push(text(`${statusIcon(tc.status)} `));
    }
    headingNodes.push(text(tc.story.scenario));
    content.push(heading(level, headingNodes));

    const metaChildren: AdfNode[] = [];
    if (tc.tags.length > 0) {
      metaChildren.push(text("Tags: ", strong()));
      tc.tags.forEach((t, i) => {
        if (i > 0) metaChildren.push(text(", "));
        metaChildren.push(codeInline(t));
      });
    }
    if (tc.story.tickets && tc.story.tickets.length > 0) {
      if (metaChildren.length > 0) metaChildren.push(text(" | "));
      metaChildren.push(text("Tickets: ", strong()));
      tc.story.tickets.forEach((ticket, i) => {
        if (i > 0) metaChildren.push(text(", "));
        const url =
          ticket.url ??
          (this.options.ticketUrlTemplate
            ? this.options.ticketUrlTemplate.replace("{ticket}", ticket.id)
            : undefined);
        metaChildren.push(
          url ? link(ticket.id, url) : codeInline(ticket.id),
        );
      });
    }
    if (
      this.options.permalinkBaseUrl &&
      tc.sourceFile !== "unknown" &&
      tc.sourceFile
    ) {
      if (metaChildren.length > 0) metaChildren.push(text(" | "));
      metaChildren.push(text("Source: ", strong()));
      const base = this.options.permalinkBaseUrl.replace(/\/$/, "");
      const url = `${base}/${tc.sourceFile}${
        tc.sourceLine > 0 ? `#L${tc.sourceLine}` : ""
      }`;
      metaChildren.push(link(tc.sourceFile, url));
    }
    if (metaChildren.length > 0) {
      content.push(paragraph(metaChildren));
    }

    if (tc.story.docs && tc.story.docs.length > 0) {
      for (const doc of tc.story.docs) this.renderDocEntry(content, doc);
    }

    if (tc.story.steps.length > 0) {
      content.push(this.renderStepsList(tc.story.steps));
      for (const step of tc.story.steps) {
        if (step.docs && step.docs.length > 0) {
          for (const doc of step.docs) this.renderDocEntry(content, doc);
        }
      }
    }

    if (
      tc.status === "failed" &&
      tc.errorMessage &&
      this.options.includeErrors
    ) {
      const errorContent =
        (tc.errorMessage ?? "") +
        (tc.errorStack ? `\n\n${tc.errorStack}` : "");
      content.push(
        panel("warning", [paragraph([text("Failure", strong())])]),
      );
      content.push(codeBlock(errorContent, "text"));
    }
  }

  private renderStepsList(steps: StoryStep[]): AdfNode {
    return {
      type: "bulletList",
      content: steps.map((step) => {
        const children: AdfNode[] = [text(`${step.keyword} `, strong()), text(step.text)];
        if (step.mode && step.mode !== "normal") {
          children.push(text(` (${step.mode})`, em()));
        }
        return {
          type: "listItem",
          content: [paragraph(children)],
        };
      }),
    };
  }

  // --------------------------------------------------------------------------
  // Doc entries
  // --------------------------------------------------------------------------

  private renderDocEntry(content: AdfNode[], entry: DocEntry): void {
    switch (entry.kind) {
      case "note":
        content.push(panel("info", [paragraph([text(entry.text)])]));
        break;

      case "tag": {
        const kids: AdfNode[] = [];
        entry.names.forEach((name, i) => {
          if (i > 0) kids.push(text(" "));
          kids.push(codeInline(name));
        });
        if (kids.length > 0) content.push(paragraph(kids));
        break;
      }

      case "kv": {
        const val =
          typeof entry.value === "string"
            ? entry.value
            : JSON.stringify(entry.value);
        content.push(
          paragraph([text(`${entry.label}: `, strong()), codeInline(val)]),
        );
        break;
      }

      case "code":
        if (entry.label) {
          content.push(paragraph([text(entry.label, strong())]));
        }
        content.push(codeBlock(entry.content ?? "", entry.lang));
        break;

      case "table":
        if (entry.label) {
          content.push(paragraph([text(entry.label, strong())]));
        }
        content.push(
          table([
            tableRow(entry.columns.map((c) => tableHeader(c))),
            ...entry.rows.map((row) =>
              tableRow(row.map((cell) => tableCell(cell))),
            ),
          ]),
        );
        break;

      case "link":
        content.push(paragraph([link(entry.label, entry.url)]));
        break;

      case "section":
        if (entry.title) {
          content.push(paragraph([text(entry.title, strong())]));
        }
        // Section markdown is rendered as a plain-text paragraph; deep markdown
        // parsing inside sections is out of scope for the ADF formatter.
        if (entry.markdown) {
          for (const para of entry.markdown.split(/\n{2,}/)) {
            const trimmed = para.trim();
            if (trimmed) content.push(paragraph([text(trimmed)]));
          }
        }
        break;

      case "mermaid":
        if (entry.title) {
          content.push(paragraph([text(entry.title, strong())]));
        }
        content.push(codeBlock(entry.code ?? "", "mermaid"));
        break;

      case "screenshot":
        content.push(
          paragraph([
            text(entry.alt ?? "Screenshot", strong()),
            text(": "),
            link(entry.path, entry.path),
          ]),
        );
        break;

      case "video":
        // ADF has no inline video node, so surface a captioned link.
        content.push(
          paragraph([
            text(entry.caption ?? "Video", strong()),
            text(": "),
            link(entry.path, entry.path),
          ]),
        );
        break;

      case "html":
        // ADF has no iframe node — surface a captioned link for url/path,
        // a code block for inline content.
        if (entry.url !== undefined || entry.path !== undefined) {
          const target = entry.url ?? entry.path ?? "";
          content.push(
            paragraph([
              text(entry.title ?? "Embedded HTML", strong()),
              text(": "),
              link(target, target),
            ]),
          );
          break;
        }
        content.push(paragraph([text(entry.title ?? "Embedded HTML", strong())]));
        content.push(codeBlock(entry.content ?? "", "html"));
        break;

      case "custom":
        content.push(paragraph([text(`[${entry.type}]`, strong())]));
        content.push(codeBlock(JSON.stringify(entry.data ?? null, null, 2), "json"));
        break;
    }

    if (entry.children && entry.children.length > 0) {
      for (const child of entry.children) {
        this.renderDocEntry(content, child);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Sorting
  // --------------------------------------------------------------------------

  private sortCases(cases: TestCaseResult[]): TestCaseResult[] {
    if (this.options.sortScenarios === "alpha") {
      return [...cases].sort((a, b) =>
        a.story.scenario.localeCompare(b.story.scenario),
      );
    }
    if (this.options.sortScenarios === "source") {
      return [...cases].sort(
        (a, b) => (a.story.sourceOrder ?? 0) - (b.story.sourceOrder ?? 0),
      );
    }
    return cases;
  }

  private sortSuiteGroups(
    entries: [string, TestCaseResult[]][],
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

// ============================================================================
// ADF node builders
// ============================================================================

function text(value: string, mark?: AdfMark | AdfMark[]): AdfNode {
  const node: AdfNode = { type: "text", text: value };
  if (mark) {
    node.marks = Array.isArray(mark) ? mark : [mark];
  }
  return node;
}

function strong(): AdfMark {
  return { type: "strong" };
}

function em(): AdfMark {
  return { type: "em" };
}

function codeMark(): AdfMark {
  return { type: "code" };
}

function codeInline(value: string): AdfNode {
  return text(value, codeMark());
}

function link(label: string, href: string): AdfNode {
  return text(label, { type: "link", attrs: { href } });
}

function paragraph(content: AdfNode[]): AdfNode {
  return { type: "paragraph", content };
}

function heading(level: number, content: AdfNode[]): AdfNode {
  return {
    type: "heading",
    attrs: { level: clampHeadingLevel(level) },
    content,
  };
}

function codeBlock(content: string, lang?: string): AdfNode {
  return {
    type: "codeBlock",
    attrs: lang ? { language: lang } : {},
    content: content ? [{ type: "text", text: content }] : [],
  };
}

function panel(
  panelType: "info" | "note" | "warning" | "success" | "error",
  content: AdfNode[],
): AdfNode {
  return { type: "panel", attrs: { panelType }, content };
}

function table(rows: AdfNode[]): AdfNode {
  return {
    type: "table",
    attrs: { isNumberColumnEnabled: false, layout: "default" },
    content: rows,
  };
}

function tableRow(cells: AdfNode[]): AdfNode {
  return { type: "tableRow", content: cells };
}

function tableHeader(value: string): AdfNode {
  return { type: "tableHeader", content: [paragraph([text(value)])] };
}

function tableCell(value: string): AdfNode {
  return { type: "tableCell", content: [paragraph([text(value)])] };
}

// ============================================================================
// Helpers
// ============================================================================

function clampHeadingLevel(level: number): 1 | 2 | 3 | 4 | 5 | 6 {
  if (level < 1) return 1;
  if (level > 6) return 6;
  return level as 1 | 2 | 3 | 4 | 5 | 6;
}

function statusIcon(status: TestStatus): string {
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

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key);
    if (existing) existing.push(item);
    else map.set(key, [item]);
  }
  return map;
}
