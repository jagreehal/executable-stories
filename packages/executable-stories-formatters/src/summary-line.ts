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

/**
 * Build the summary line. `files` are the report paths just written.
 *
 * `ranCount` is how many scenarios this run produced, when that is fewer than
 * the report covers. A filtered run writes a report spanning the whole suite,
 * and reporting only the total would read as though this run verified all of
 * it.
 *
 * `unasserted` is how many scenarios passed without asserting anything. Omitted
 * entirely when no adapter in the run could observe assertions.
 */
export function summaryLine(
  counts: SummaryCounts,
  files: string[],
  durationMs: number,
  options: { ranCount?: number; unasserted?: number } = {}
): string {
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
  const line = `${icon} ${scenarios} (${parts.join(", ")})${written} in ${durationMs}ms`;

  const notes: string[] = [];

  const ran = options.ranCount;
  if (ran !== undefined && ran < total) {
    notes.push(`${ran} from this run, ${total - ran} carried over from earlier runs`);
  }

  // A green scenario that checked nothing is the cheapest credibility problem
  // there is, and the one most easily missed. Left unsaid when no adapter could
  // observe assertions: silence is honest, a zero would be a claim.
  const unasserted = options.unasserted;
  if (unasserted !== undefined && unasserted > 0) {
    notes.push(
      `${unasserted} scenario${unasserted === 1 ? "" : "s"} asserted nothing`
    );
  }

  if (notes.length === 0) return line;
  return `${line}\n  ${notes.join("; ")}`;
}
