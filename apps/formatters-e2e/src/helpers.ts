import type { Page } from "@playwright/test";
import {
  HtmlFormatter,
  canonicalizeRun,
  RunDiffHtmlFormatter,
  diffRuns,
} from "executable-stories-formatters";
import type {
  RawRun,
  TestRunResult,
  RunDiffHtmlOptions,
  HtmlOptions,
} from "executable-stories-formatters";

export type { RawRun, TestRunResult, HtmlOptions };

/**
 * Generate main report HTML and load it into a Playwright page.
 */
export async function loadMainReport(
  page: Page,
  rawRun: RawRun,
  options?: Partial<HtmlOptions>,
): Promise<void> {
  const run = canonicalizeRun(rawRun);
  const formatter = new HtmlFormatter({
    syntaxHighlighting: false,
    mermaidEnabled: false,
    markdownEnabled: false,
    ...options,
  });
  const html = formatter.format(run);
  await loadHtml(page, html);
}

/**
 * Generate diff report HTML and load it into a Playwright page.
 */
export async function loadDiffReport(
  page: Page,
  baseline: TestRunResult,
  current: TestRunResult,
  options?: RunDiffHtmlOptions,
): Promise<void> {
  const diff = diffRuns(baseline, current);
  const formatter = new RunDiffHtmlFormatter(options);
  const html = formatter.format(diff);
  await loadHtml(page, html);
}

/**
 * Load HTML into a page via route interception so localStorage is available.
 * page.setContent() runs on about:blank which blocks localStorage access.
 */
async function loadHtml(page: Page, html: string): Promise<void> {
  await page.route("https://report.test/", (route) =>
    route.fulfill({ contentType: "text/html", body: html }),
  );
  await page.goto("https://report.test/", { waitUntil: "domcontentloaded" });
}
