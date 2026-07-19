/**
 * Entry point for a colocated report tree.
 *
 * Colocated/mirrored output writes one report per source file, which is great
 * for reading a single suite's docs next to its code — but leaves a directory
 * of files with no front door. Someone handed the output folder has nothing to
 * open. This generates a small `index.html` listing every report that was
 * written, with per-file status counts, so the tree is navigable.
 *
 * Only for colocated mode: aggregated output already writes a single file that
 * IS the entry point.
 */
import path from "node:path";

import type { TestRunResult } from "executable-stories-core/types/test-result";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface ColocatedIndexEntry {
  /** Report path, relative to the index file. */
  href: string;
  /** Source file the report documents. */
  sourceFile: string;
  counts: { passed: number; failed: number; skipped: number; pending: number };
}

/** Map a canonical status onto the four buckets the index counts. */
function bucket(status: string): keyof ColocatedIndexEntry["counts"] | undefined {
  if (status === "passed" || status === "pass") return "passed";
  if (status === "failed" || status === "fail") return "failed";
  if (status === "skipped" || status === "skip") return "skipped";
  if (status === "pending" || status === "todo") return "pending";
  return undefined;
}

/**
 * Pair each written report with the source file it documents and the status
 * counts for that file. `reportPaths` are the paths the generator wrote, in the
 * same order as the source files it grouped by.
 */
export function buildIndexEntries(
  run: TestRunResult,
  reportsBySourceFile: ReadonlyMap<string, string>,
  indexDir: string,
): ColocatedIndexEntry[] {
  const entries: ColocatedIndexEntry[] = [];
  for (const [sourceFile, reportPath] of reportsBySourceFile) {
    const counts = { passed: 0, failed: 0, skipped: 0, pending: 0 };
    for (const tc of run.testCases) {
      if (tc.sourceFile !== sourceFile) continue;
      const key = bucket(tc.status as string);
      if (key) counts[key] += 1;
    }
    // Posix separators: this is an href, not a filesystem path.
    const href = path.relative(indexDir, reportPath).split(path.sep).join("/");
    entries.push({ href, sourceFile, counts });
  }
  return entries.sort((a, b) => {
    // Files with failures first — the index is a triage surface too.
    if (a.counts.failed !== b.counts.failed) return b.counts.failed - a.counts.failed;
    return a.sourceFile.localeCompare(b.sourceFile);
  });
}

/** Total the per-file counts for the header line. */
function totals(entries: ColocatedIndexEntry[]): ColocatedIndexEntry["counts"] {
  const t = { passed: 0, failed: 0, skipped: 0, pending: 0 };
  for (const e of entries) {
    t.passed += e.counts.passed;
    t.failed += e.counts.failed;
    t.skipped += e.counts.skipped;
    t.pending += e.counts.pending;
  }
  return t;
}

/**
 * Render the index page. Self-contained (inline CSS, no scripts, no CDN) so it
 * works from a file:// path or any static host, matching the standalone report.
 */
export function renderColocatedIndex(entries: ColocatedIndexEntry[], title = "Test Reports"): string {
  const t = totals(entries);
  const total = t.passed + t.failed + t.skipped + t.pending;
  const rows = entries
    .map((e) => {
      const pills = (["failed", "passed", "skipped", "pending"] as const)
        .filter((k) => e.counts[k] > 0)
        .map((k) => `<span class="pill ${k}">${e.counts[k]} ${k}</span>`)
        .join(" ");
      return (
        `<li class="${e.counts.failed > 0 ? "has-failures" : ""}">` +
        `<a href="${escapeHtml(e.href)}">${escapeHtml(e.sourceFile)}</a>` +
        `<span class="counts">${pills}</span></li>`
      );
    })
    .join("\n      ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; --fg: #1c1e21; --muted: #6b7280; --border: #d9dbe0; --bg: #fff;
    --pass: #0f5a23; --fail: #c11d28; --warn: #8a3f06; --pending: #6b27c9; }
  @media (prefers-color-scheme: dark) {
    :root { --fg: #e6e6e6; --muted: #9aa0a6; --border: #33373d; --bg: #16181d;
      --pass: #4ade80; --fail: #f87171; --warn: #fbbf24; --pending: #c4b5fd; }
  }
  body { margin: 0; padding: 2rem 1.25rem; background: var(--bg); color: var(--fg);
    font: 16px/1.5 "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 60rem; margin: 0 auto; }
  h1 { font-size: 1.4rem; margin: 0 0 .25rem; }
  .summary { color: var(--muted); font-size: .9rem; margin: 0 0 1.5rem; }
  ul { list-style: none; margin: 0; padding: 0; border: 1px solid var(--border); border-radius: .6rem; overflow: hidden; }
  li { display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    padding: .7rem 1rem; border-bottom: 1px solid var(--border); }
  li:last-child { border-bottom: 0; }
  li.has-failures { background: color-mix(in srgb, var(--fail) 8%, transparent); }
  a { color: inherit; font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: .9rem; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .counts { display: flex; gap: .4rem; flex-wrap: wrap; }
  .pill { font-size: .75rem; padding: .1rem .5rem; border-radius: 999px; white-space: nowrap;
    border: 1px solid currentColor; }
  .pill.passed { color: var(--pass); } .pill.failed { color: var(--fail); }
  .pill.skipped { color: var(--warn); } .pill.pending { color: var(--pending); }
  .empty { color: var(--muted); padding: 1rem; }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(title)}</h1>
  <p class="summary">${entries.length} file${entries.length === 1 ? "" : "s"} · ${total} scenario${total === 1 ? "" : "s"} · ${t.passed} passed${t.failed > 0 ? `, ${t.failed} failed` : ""}${t.skipped > 0 ? `, ${t.skipped} skipped` : ""}${t.pending > 0 ? `, ${t.pending} pending` : ""}</p>
  ${
    entries.length === 0
      ? '<p class="empty">No reports were written.</p>'
      : `<ul>
      ${rows}
    </ul>`
  }
</main>
</body>
</html>
`;
}
