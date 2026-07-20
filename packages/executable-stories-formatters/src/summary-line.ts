/**
 * The one-line outcome `format` prints when it finishes.
 *
 * Before this, a successful `format` said nothing beyond the file list, so a
 * run that produced an empty report, or one where every scenario failed, looked
 * exactly like a healthy one. The line leads with ✖ when anything failed, so a
 * glance at the terminal answers "did my suite pass" without opening anything.
 *
 * Its own module because `cli.ts` invokes `main()` at import time and therefore
 * cannot be imported from a test.
 */

export interface SummaryCounts {
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
}

/** Build the summary line. `files` are the report paths just written. */
export function summaryLine(counts: SummaryCounts, files: string[], durationMs: number): string {
  const { passed, failed, skipped, pending } = counts;
  const total = passed + failed + skipped + pending;
  // Passed is always shown (so "0 passed" is visible); the rest only when
  // non-zero, to keep the common all-green line short.
  const parts = [`${passed} passed`];
  if (failed > 0) parts.push(`${failed} failed`);
  if (skipped > 0) parts.push(`${skipped} skipped`);
  if (pending > 0) parts.push(`${pending} pending`);
  const icon = failed > 0 ? "✖" : "✔";
  const scenarios = `${total} scenario${total === 1 ? "" : "s"}`;
  const written = files.length > 0 ? ` → ${files.join(", ")}` : "";
  return `${icon} ${scenarios} (${parts.join(", ")})${written} in ${durationMs}ms`;
}
