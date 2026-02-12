/**
 * JUnit XML Formatter - Layer 3.
 *
 * Transforms canonical TestRunResult into JUnit XML format
 * for CI system integration.
 */

import type { DocEntry, StoryStep } from "../types/story";
import type { TestRunResult, TestCaseResult } from "../types/test-result";

/** Options for JUnit XML formatting */
export interface JUnitOptions {
  /** Test suite name. Default: "Test Suite" */
  suiteName?: string;
  /** Include system-out/system-err. Default: true */
  includeOutput?: boolean;
  /** Pretty-print XML output. Default: true */
  pretty?: boolean;
}

/**
 * JUnit XML Formatter.
 *
 * Transforms TestRunResult into JUnit XML format for CI integrations.
 * Compatible with Jenkins, GitHub Actions, and other CI systems.
 */
export class JUnitFormatter {
  private options: Required<JUnitOptions>;

  constructor(options: JUnitOptions = {}) {
    this.options = {
      suiteName: options.suiteName ?? "Test Suite",
      includeOutput: options.includeOutput ?? true,
      pretty: options.pretty ?? true,
    };
  }

  /**
   * Format a test run into JUnit XML.
   *
   * @param run - Canonical test run result
   * @returns JUnit XML string
   */
  format(run: TestRunResult): string {
    const indent = this.options.pretty ? "  " : "";
    const newline = this.options.pretty ? "\n" : "";

    // Calculate totals
    const tests = run.testCases.length;
    const failures = run.testCases.filter((tc) => tc.status === "failed").length;
    const skipped = run.testCases.filter(
      (tc) => tc.status === "skipped" || tc.status === "pending"
    ).length;
    const errors = 0; // We don't distinguish errors from failures
    const time = (run.durationMs / 1000).toFixed(3);

    // Build XML
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(
      `<testsuites name="${escapeXml(this.options.suiteName)}" tests="${tests}" failures="${failures}" errors="${errors}" skipped="${skipped}" time="${time}">`
    );

    // Group test cases by source file (one testsuite per file)
    const byFile = groupBy(run.testCases, (tc) => tc.sourceFile);

    for (const [file, testCases] of byFile) {
      lines.push(...this.buildTestSuite(file, testCases, indent, newline));
    }

    lines.push("</testsuites>");

    return lines.join(newline);
  }

  /**
   * Build a testsuite element for a file.
   */
  private buildTestSuite(
    file: string,
    testCases: TestCaseResult[],
    indent: string,
    newline: string
  ): string[] {
    const lines: string[] = [];

    const tests = testCases.length;
    const failures = testCases.filter((tc) => tc.status === "failed").length;
    const skipped = testCases.filter(
      (tc) => tc.status === "skipped" || tc.status === "pending"
    ).length;
    const time = testCases
      .reduce((sum, tc) => sum + tc.durationMs, 0) / 1000;

    // Normalize path separators for consistent output across platforms
    const normalizedFile = file.replace(/\\/g, "/");

    lines.push(
      `${indent}<testsuite name="${escapeXml(normalizedFile)}" tests="${tests}" failures="${failures}" errors="0" skipped="${skipped}" time="${time.toFixed(3)}">`
    );

    for (const tc of testCases) {
      lines.push(...this.buildTestCase(tc, indent + indent, newline));
    }

    lines.push(`${indent}</testsuite>`);

    return lines;
  }

  /**
   * Build a testcase element.
   */
  private buildTestCase(
    tc: TestCaseResult,
    indent: string,
    newline: string
  ): string[] {
    const lines: string[] = [];

    // Build classname from titlePath or sourceFile
    // Normalize path separators (Windows backslashes and Unix forward slashes)
    const classname = tc.titlePath.length > 0
      ? tc.titlePath.join(".")
      : tc.sourceFile
          .replace(/[\\/]+/g, ".") // Replace path separators with dots
          .replace(/\.[^.]+$/, ""); // Remove file extension

    const name = tc.story.scenario;
    const time = (tc.durationMs / 1000).toFixed(3);

    const hasFailure = tc.status === "failed";
    const hasSkipped = tc.status === "skipped" || tc.status === "pending";
    const hasOutput = this.options.includeOutput && tc.story.steps.length > 0;

    // Use full form if there's any content to include
    if (hasFailure || hasSkipped || hasOutput) {
      lines.push(
        `${indent}<testcase classname="${escapeXml(classname)}" name="${escapeXml(name)}" time="${time}">`
      );

      if (hasFailure) {
        const message = tc.errorMessage
          ? escapeXml(tc.errorMessage.split("\n")[0])
          : "Test failed";
        lines.push(`${indent}${indent}<failure message="${message}">`);
        if (tc.errorMessage) {
          lines.push(escapeXml(tc.errorMessage));
        }
        if (tc.errorStack) {
          lines.push("");
          lines.push(escapeXml(tc.errorStack));
        }
        lines.push(`${indent}${indent}</failure>`);
      } else if (hasSkipped) {
        const message = tc.status === "pending" ? "Test pending" : "Test skipped";
        lines.push(`${indent}${indent}<skipped message="${message}"/>`);
      }

      // Include system-out with step info and docs if requested
      if (hasOutput) {
        const output = this.buildSystemOut(tc);
        lines.push(`${indent}${indent}<system-out>${escapeXml(output)}</system-out>`);
      }

      lines.push(`${indent}</testcase>`);
    } else {
      // Self-closing tag for tests without content
      lines.push(
        `${indent}<testcase classname="${escapeXml(classname)}" name="${escapeXml(name)}" time="${time}"/>`
      );
    }

    return lines;
  }

  /**
   * Build system-out content with steps and docs.
   */
  private buildSystemOut(tc: TestCaseResult): string {
    const outputLines: string[] = [];

    // Story-level docs
    if (tc.story.docs && tc.story.docs.length > 0) {
      for (const doc of tc.story.docs) {
        outputLines.push(this.renderDocEntry(doc));
      }
      outputLines.push("");
    }

    // Steps with their docs
    for (const step of tc.story.steps) {
      outputLines.push(this.renderStep(step));
    }

    return outputLines.join("\n").trim();
  }

  /**
   * Render a step with its docs.
   */
  private renderStep(step: StoryStep): string {
    const lines: string[] = [];
    lines.push(`${step.keyword} ${step.text}`);

    // Step docs
    if (step.docs && step.docs.length > 0) {
      for (const doc of step.docs) {
        const rendered = this.renderDocEntry(doc, "  ");
        if (rendered) {
          lines.push(rendered);
        }
      }
    }

    return lines.join("\n");
  }

  /**
   * Render a doc entry as plain text.
   */
  private renderDocEntry(entry: DocEntry, indent = ""): string {
    switch (entry.kind) {
      case "note":
        return `${indent}> ${entry.text}`;

      case "tag":
        return `${indent}Tags: ${entry.names.join(", ")}`;

      case "kv": {
        const val = typeof entry.value === "string"
          ? entry.value
          : JSON.stringify(entry.value);
        return `${indent}${entry.label}: ${val}`;
      }

      case "code": {
        const langLabel = entry.lang ? ` (${entry.lang})` : "";
        const header = entry.label ? `${indent}${entry.label}${langLabel}:\n` : "";
        const codeLines = entry.content.split("\n").map((l) => `${indent}  ${l}`).join("\n");
        return `${header}${codeLines}`;
      }

      case "table": {
        const lines: string[] = [];
        if (entry.label) {
          lines.push(`${indent}${entry.label}:`);
        }
        lines.push(`${indent}| ${entry.columns.join(" | ")} |`);
        lines.push(`${indent}| ${entry.columns.map(() => "---").join(" | ")} |`);
        for (const row of entry.rows) {
          lines.push(`${indent}| ${row.join(" | ")} |`);
        }
        return lines.join("\n");
      }

      case "link":
        return `${indent}${entry.label}: ${entry.url}`;

      case "section": {
        const lines: string[] = [];
        lines.push(`${indent}${entry.title}:`);
        for (const line of entry.markdown.split("\n")) {
          lines.push(`${indent}  ${line}`);
        }
        return lines.join("\n");
      }

      case "mermaid": {
        const lines: string[] = [];
        if (entry.title) {
          lines.push(`${indent}${entry.title}:`);
        }
        for (const line of entry.code.split("\n")) {
          lines.push(`${indent}  ${line}`);
        }
        return lines.join("\n");
      }

      case "screenshot":
        return `${indent}Screenshot: ${entry.alt ?? entry.path}`;

      case "custom": {
        const dataStr = JSON.stringify(entry.data, null, 2);
        const lines: string[] = [];
        lines.push(`${indent}[${entry.type}]:`);
        for (const line of dataStr.split("\n")) {
          lines.push(`${indent}  ${line}`);
        }
        return lines.join("\n");
      }

      default:
        return "";
    }
  }
}

/**
 * Escape special XML characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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
