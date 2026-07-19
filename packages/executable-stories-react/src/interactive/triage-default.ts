/**
 * Failure-first defaults for the interactive report.
 *
 * A report of a broken run is a triage surface before it is an archive: the
 * question is "what failed", not "show me all 400 scenarios". So on a run with
 * failures the report opens with passing work collapsed to its titles and
 * failing work expanded — the same "compress passing, expand failing" posture
 * the `check` CLI takes.
 *
 * Two deliberate limits:
 *  - an all-green run collapses NOTHING; there is nothing to triage, and a wall
 *    of collapsed titles would be worse than the current view.
 *  - this only ever seeds the FIRST visit. `useCollapseState` prefers a
 *    persisted set, so a user who has expressed a preference keeps it.
 */
import type { StoryReport } from "executable-stories-core";

/** True when a scenario is one the reader needs to see immediately. */
function needsAttention(status: string): boolean {
  return status === "failed";
}

/**
 * The ids to collapse on first view: every passing/skipped feature and
 * scenario, when the run has at least one failure. Empty set otherwise.
 */
export function defaultCollapsedIds(report: StoryReport): Set<string> {
  const collapsed = new Set<string>();
  if (report.summary.failed === 0) return collapsed;

  for (const feature of report.features) {
    const featureHasFailure = feature.scenarios.some((s) => needsAttention(s.status));
    // A feature with no failures collapses whole — its scenarios stay in the
    // set too, so expanding the feature doesn't dump every step at once.
    if (!featureHasFailure) collapsed.add(feature.id);
    for (const scenario of feature.scenarios) {
      if (!needsAttention(scenario.status)) collapsed.add(scenario.id);
    }
  }
  return collapsed;
}

/**
 * Order features so the ones with failures come first, preserving the original
 * relative order within each group (a stable partition, not a re-sort — source
 * order still carries meaning for everything else).
 */
export function failuresFirst(report: StoryReport): StoryReport {
  if (report.summary.failed === 0) return report;
  const withFailures: StoryReport["features"] = [];
  const rest: StoryReport["features"] = [];
  for (const feature of report.features) {
    (feature.scenarios.some((s) => needsAttention(s.status)) ? withFailures : rest).push(feature);
  }
  if (withFailures.length === 0) return report;
  return { ...report, features: [...withFailures, ...rest] };
}
