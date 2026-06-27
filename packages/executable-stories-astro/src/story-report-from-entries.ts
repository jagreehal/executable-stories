/**
 * Rebuild a full {@link StoryReport} from the flat scenario entries the
 * `stories` collection stores.
 *
 * Each entry is a {@link StoryEntryData} — a complete `ReportScenario` (steps,
 * doc entries, attachments, otel spans, durations) plus the entry-only fields
 * the loader stamps on (`entryId`, `slug`, `feature`, `source`, `run`,
 * `sample`). Grouping the entries back by their owning feature is therefore
 * lossless at the scenario level; only the report-level meta (started/duration)
 * is approximated, since the collection does not carry the run's wall-clock
 * window. This lets the index render the SAME `<Report>` component tree as the
 * standalone single-file HTML — one renderer, two surfaces.
 */
import {
  STORY_REPORT_SCHEMA_VERSION,
  type StoryReport,
  type ReportFeature,
  type ReportSummary,
  type ReportScenario,
} from "executable-stories-core";

import type { StoryEntryData } from "./loader.js";

function emptySummary(): ReportSummary {
  return { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0, durationMs: 0 };
}

function tally(summary: ReportSummary, scenario: ReportScenario): void {
  summary.total += 1;
  summary[scenario.status] += 1;
  summary.durationMs += scenario.durationMs;
}

/** Strip the entry-only fields off an entry, leaving a clean `ReportScenario`. */
function toScenario(entry: StoryEntryData): ReportScenario {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { entryId, slug, feature, source, run, sample, ...scenario } = entry;
  return scenario;
}

/**
 * Group the flat entries into a {@link StoryReport}, preserving first-seen
 * feature order. Returns an empty report (no features) for an empty input.
 */
export function storyReportFromEntries(entries: StoryEntryData[]): StoryReport {
  const order: string[] = [];
  const groups = new Map<string, { meta: StoryEntryData["feature"]; scenarios: ReportScenario[] }>();

  for (const entry of entries) {
    const key = entry.feature.id || `${entry.feature.sourceFile}::${entry.feature.title}`;
    let group = groups.get(key);
    if (!group) {
      group = { meta: entry.feature, scenarios: [] };
      groups.set(key, group);
      order.push(key);
    }
    group.scenarios.push(toScenario(entry));
  }

  const summary = emptySummary();
  const features: ReportFeature[] = order.map((key) => {
    const group = groups.get(key)!;
    const featureSummary = emptySummary();
    for (const scenario of group.scenarios) {
      tally(featureSummary, scenario);
      tally(summary, scenario);
    }
    return {
      id: group.meta.id,
      title: group.meta.title,
      sourceFile: group.meta.sourceFile,
      summary: featureSummary,
      scenarios: group.scenarios,
    };
  });

  const run = entries[0]?.run;
  const finishedAtMs = run?.finishedAtMs ?? 0;
  // The collection does not carry the run's start/wall-clock; approximate the
  // window from the summed scenario durations so ReportMeta still shows a span.
  const durationMs = summary.durationMs;

  return {
    schemaVersion: STORY_REPORT_SCHEMA_VERSION,
    runId: run?.runId ?? "",
    startedAtMs: finishedAtMs > 0 ? Math.max(0, finishedAtMs - durationMs) : 0,
    finishedAtMs,
    durationMs,
    projectRoot: "",
    gitSha: run?.gitSha,
    summary,
    features,
  };
}
