/** Collect and rewrite local evidence paths in a StoryReport. */

import type { ReportDocEntry, StoryReport } from "./types/story-report.js";

/**
 * Absolute URLs and data URIs already resolve for a remote viewer; everything
 * else names a file on this machine and has to travel with the report.
 *
 * A Windows drive letter is tested before the scheme rule, because `C:\shots`
 * has the shape of a URL scheme and is not one. Ruling it remote drops every
 * asset on Windows in silence — not uploaded, and not reported missing either,
 * since a path called remote is never looked for on disk. Doc entries carry
 * absolute paths routinely (Playwright videos, above all), so this is the
 * normal case, not the edge.
 */
export function isLocalAssetPath(value: string): boolean {
  if (value.length === 0) return false;
  if (value.startsWith("//")) return false; // protocol-relative URL
  if (/^[a-z]:[\\/]/i.test(value)) return true; // C:\ or C:/ — a path, not a scheme
  return !/^[a-z][a-z0-9+.-]*:/i.test(value);
}

/**
 * Apply `map` to every local asset path in a doc entry tree, returning new
 * entries. `map` returning undefined leaves the path as it is.
 */
function mapEntry(
  entry: ReportDocEntry,
  map: (path: string) => string | undefined,
): ReportDocEntry {
  const next = { ...entry } as ReportDocEntry;

  const apply = (value: string | undefined): string | undefined =>
    value !== undefined && isLocalAssetPath(value) ? (map(value) ?? value) : value;

  // The entry's own paths first, then its children: callers get document order.
  if (next.kind === "screenshot") next.path = apply(next.path) ?? next.path;
  else if (next.kind === "video") {
    next.path = apply(next.path) ?? next.path;
    if (next.poster !== undefined) next.poster = apply(next.poster);
  } else if (next.kind === "html" && next.path !== undefined) {
    next.path = apply(next.path);
  }

  if (entry.children) next.children = entry.children.map((child) => mapEntry(child, map));
  return next;
}

function mapReport(
  report: StoryReport,
  map: (path: string) => string | undefined,
): StoryReport {
  return {
    ...report,
    features: report.features.map((feature) => ({
      ...feature,
      scenarios: feature.scenarios.map((scenario) => ({
        ...scenario,
        docEntries: scenario.docEntries.map((e) => mapEntry(e, map)),
        steps: scenario.steps.map((step) => ({
          ...step,
          docEntries: step.docEntries.map((e) => mapEntry(e, map)),
        })),
      })),
    })),
  };
}

/**
 * Every local asset path in the report, de-duplicated, in first-seen order.
 * Paths are exactly as the report records them (relative to the report file),
 * because that is what both the uploader and the renderer key on.
 */
export function collectReportAssets(report: StoryReport): string[] {
  const found = new Set<string>();
  mapReport(report, (path) => {
    found.add(path);
    return undefined;
  });
  return [...found];
}

/**
 * A copy of the report with every local asset path replaced by `map(path)`.
 * Used by a host serving a report it did not produce: the files live behind
 * its own URLs, not beside an HTML file on someone's laptop.
 */
export function rewriteReportAssets(
  report: StoryReport,
  map: (path: string) => string,
): StoryReport {
  return mapReport(report, map);
}
