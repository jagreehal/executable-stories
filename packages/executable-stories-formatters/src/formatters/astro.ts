/**
 * Astro Formatter - Layer 3.
 *
 * Wraps the MarkdownFormatter to produce .md files with YAML frontmatter
 * (title, description, sidebar.badge) for Starlight content collections.
 * The scaffolded docs site uses themed CSS matching the HTML report design system.
 */

import { MarkdownFormatter } from "./markdown";
import type { MarkdownOptions } from "./markdown";
import type { TestRunResult, TestCaseResult } from "executable-stories-core/types/test-result";
import { humanizeSourceFile } from "executable-stories-core/utils/source-file";

export interface StarlightBadge {
  text: string;
  variant: "success" | "danger" | "caution" | "note" | "tip";
}

export interface AstroFormatterOptions {
  assetsBaseUrl?: string;
  /**
   * Title each page by its own suite/file rather than the configured title.
   * Set by colocated mode (one page per file) so the docs nav reads with
   * distinct, meaningful labels.
   */
  perFileTitle?: boolean;
  markdown?: Omit<MarkdownOptions, "includeFrontMatter" | "includeSummaryTable" | "includeMetadata" | "stepStyle">;
}

export class AstroFormatter {
  private markdownFormatter: MarkdownFormatter;
  private title: string;
  private perFileTitle: boolean;

  constructor(options: AstroFormatterOptions = {}) {
    this.title = options.markdown?.title ?? "User Stories";
    this.perFileTitle = options.perFileTitle ?? false;
    this.markdownFormatter = new MarkdownFormatter({
      ...options.markdown,
      title: this.title,
      stepStyle: "gherkin",
      includeFrontMatter: false,
      includeSummaryTable: false,
      includeMetadata: false,
      // A per-file page is one file already — group by suite/describe so the
      // body shows clean section headings, not the redundant source path.
      groupBy: this.perFileTitle ? "suite" : (options.markdown?.groupBy ?? "file"),
    });
  }

  format(run: TestRunResult): string {
    const markdown = this.markdownFormatter.format(run);
    // Strip the h1 title — Starlight renders its own from frontmatter
    const body = markdown.replace(/^# .+\n\n?/, "");
    const frontmatter = this.buildFrontmatter(run);
    return `${frontmatter}\n${body}`;
  }

  /**
   * Title for the page. A per-file page (one source file — i.e. colocated mode)
   * is titled by its suite/describe name, falling back to a humanized filename,
   * so the docs nav reads "Convert Currency" not "User Stories" six times over.
   * Multi-file (aggregated) pages keep the configured title.
   */
  private deriveTitle(run: TestRunResult): string {
    if (!this.perFileTitle) return this.title;
    const sourceFiles = new Set(
      run.testCases.map((tc) => tc.sourceFile).filter((f) => f && f !== "unknown"),
    );
    if (sourceFiles.size !== 1) return this.title;

    const suites = new Set(
      run.testCases.map((tc) => tc.titlePath?.[0]).filter((s): s is string => Boolean(s)),
    );
    if (suites.size === 1) return [...suites][0];
    return humanizeSourceFile([...sourceFiles][0]) || this.title;
  }

  private buildFrontmatter(run: TestRunResult): string {
    const badge = AstroFormatter.computeBadge(run.testCases);
    const count = run.testCases.length;
    const description = `${count} scenario${count !== 1 ? "s" : ""} — ${badge.text.toLowerCase()}`;
    const lines = [
      "---",
      `title: ${yamlScalar(this.deriveTitle(run))}`,
      `description: ${description}`,
      "sidebar:",
      "  badge:",
      `    text: ${badge.text}`,
      `    variant: ${badge.variant}`,
      "---",
    ];
    return lines.join("\n");
  }

  static computeBadge(testCases: Pick<TestCaseResult, "status">[]): StarlightBadge {
    const statuses = new Set(testCases.map((tc) => tc.status));
    if (statuses.has("failed")) return { text: "Failed", variant: "danger" };
    if (statuses.has("pending")) return { text: "Pending", variant: "caution" };
    if (statuses.has("skipped") && !statuses.has("passed")) return { text: "Skipped", variant: "caution" };
    return { text: "Passed", variant: "success" };
  }
}

/** Single-quote a YAML scalar when it could otherwise be misparsed (colons, etc.). */
function yamlScalar(value: string): string {
  if (/[:#[\]{}&*!|>'"%@`]|^[\s-]|\s$/.test(value)) {
    return `'${value.replace(/'/g, "''")}'`;
  }
  return value;
}
