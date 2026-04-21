/**
 * Astro Formatter - Layer 3.
 *
 * Wraps the MarkdownFormatter to produce .md files with YAML frontmatter
 * (title, description, sidebar.badge) for Starlight content collections.
 * The scaffolded docs site uses themed CSS matching the HTML report design system.
 */

import { MarkdownFormatter } from "./markdown";
import type { MarkdownOptions } from "./markdown";
import type { TestRunResult, TestCaseResult } from "../types/test-result";

export interface StarlightBadge {
  text: string;
  variant: "success" | "danger" | "caution" | "note" | "tip";
}

export interface AstroFormatterOptions {
  assetsBaseUrl?: string;
  markdown?: Omit<MarkdownOptions, "includeFrontMatter" | "includeSummaryTable" | "includeMetadata" | "stepStyle">;
}

export class AstroFormatter {
  private markdownFormatter: MarkdownFormatter;
  private title: string;

  constructor(options: AstroFormatterOptions = {}) {
    this.title = options.markdown?.title ?? "User Stories";
    this.markdownFormatter = new MarkdownFormatter({
      ...options.markdown,
      title: this.title,
      stepStyle: "gherkin",
      includeFrontMatter: false,
      includeSummaryTable: false,
      includeMetadata: false,
    });
  }

  format(run: TestRunResult): string {
    const markdown = this.markdownFormatter.format(run);
    // Strip the h1 title — Starlight renders its own from frontmatter
    const body = markdown.replace(/^# .+\n\n?/, "");
    const frontmatter = this.buildFrontmatter(run);
    return `${frontmatter}\n${body}`;
  }

  private buildFrontmatter(run: TestRunResult): string {
    const badge = AstroFormatter.computeBadge(run.testCases);
    const count = run.testCases.length;
    const description = `${count} scenario${count !== 1 ? "s" : ""} — ${badge.text.toLowerCase()}`;
    const lines = [
      "---",
      `title: ${this.title}`,
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
