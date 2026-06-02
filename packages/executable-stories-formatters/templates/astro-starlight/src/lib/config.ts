/**
 * Site configuration — the one place to point at your test-run data.
 *
 * The verification badges, runbook checklists, and health dashboard read the
 * latest run at build time (`report`); the Scenario Explorer fetches the same
 * file in the browser (`REPORT_URL`). If you move the report, change it here —
 * nowhere else references the path.
 *
 * Generate the report with:
 *   executable-stories format run.json --format story-report-json \
 *     --output-dir public/stories --output-name story-report
 *
 * `report` (build-time import) and `REPORT_URL` (runtime fetch) must point at
 * the same file — one is a filesystem path, the other the URL it's served at.
 */
import reportData from "../../public/stories/story-report.json";
import type { StoryReportLike } from "./verification";

/** The latest test run, imported at build time (badges, checklist, dashboard). */
export const report = reportData as StoryReportLike;

/**
 * Public URL the Scenario Explorer fetches the run from at runtime.
 * Override per-environment with `PUBLIC_STORY_REPORT_URL` in a `.env` file.
 */
export const REPORT_URL: string =
  import.meta.env.PUBLIC_STORY_REPORT_URL ?? "/stories/story-report.json";

/**
 * Base URL of the source repository (e.g. https://github.com/acme/app/blob/main).
 * When set, the Scenario Explorer turns each scenario's file path into a link to
 * the test on your git host. Leave unset to fall back to an in-page anchor.
 * Override with `PUBLIC_SOURCE_BASE_URL` in a `.env` file.
 */
export const SOURCE_BASE_URL: string =
  import.meta.env.PUBLIC_SOURCE_BASE_URL ?? "";

/**
 * Deep-link to a single story inside the Scenario Explorer. Used by the
 * verification badge and the API coverage table so "verified by X" always
 * takes you to X. Respects Astro's configured `base`.
 */
export function explorerUrl(storyId: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}explorer/#${encodeURIComponent(storyId)}`;
}
