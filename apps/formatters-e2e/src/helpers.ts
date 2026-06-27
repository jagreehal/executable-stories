import type { Page } from "@playwright/test";
import { RunDiffHtmlFormatter, diffRuns } from "executable-stories-formatters";
import type {
  RawRun,
  TestRunResult,
  RunDiffHtmlOptions,
} from "executable-stories-formatters";

export type { RawRun, TestRunResult };

/**
 * Generate run-diff report HTML and load it into a Playwright page.
 *
 * The main story report is rendered by executable-stories-react (covered by the
 * React component-test tier + the Astro docs-site e2e), so only the run-diff
 * report — which is still string-rendered — is exercised here.
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
