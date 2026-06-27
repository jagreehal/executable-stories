/**
 * Pure view-logic: categorise scenario entries into display groups for the
 * stories index, explorer, and nav. No Astro/runtime imports, so it unit-tests
 * in isolation and the route .astro files stay thin shells over it.
 */
import { slugify, type GroupBy } from "./config.js";
import type { StoryEntryData } from "./loader.js";

/** A categorised bucket of scenarios for the index/explorer/nav. */
export interface ScenarioGroup {
  /** Stable key (slug). */
  key: string;
  /** Display label. */
  label: string;
  /** Scenarios in this group (input order preserved). */
  items: StoryEntryData[];
}

const STATUS_LABEL: Record<string, string> = {
  passed: "Passed",
  failed: "Failed",
  skipped: "Skipped",
  pending: "Pending",
};

/** Scenario tallies for the index summary. `skipped` rolls up skipped + pending. */
export interface StatusCounts {
  total: number;
  passed: number;
  failed: number;
  /** skipped + pending — the index surfaces "not run" as a single bucket. */
  skipped: number;
}

/** Tally scenarios by status. Pure; pending folds into `skipped` as the index renders it. */
export function countByStatus(items: StoryEntryData[]): StatusCounts {
  const counts: StatusCounts = { total: 0, passed: 0, failed: 0, skipped: 0 };
  for (const s of items) {
    counts.total += 1;
    if (s.status === "passed") counts.passed += 1;
    else if (s.status === "failed") counts.failed += 1;
    else counts.skipped += 1; // skipped + pending
  }
  return counts;
}

/**
 * Group scenarios for display. `feature` (default) buckets by owning feature;
 * `tag` lists a scenario under each of its tags (untagged → "Untagged");
 * `source` buckets by suite; `status` by result; `none` is a single bucket.
 * Group order follows first appearance, so it's stable across runs.
 */
export function groupScenarios(scenarios: StoryEntryData[], groupBy: GroupBy = "feature"): ScenarioGroup[] {
  const groups: ScenarioGroup[] = [];
  const byKey = new Map<string, ScenarioGroup>();
  const push = (key: string, label: string, item: StoryEntryData) => {
    let g = byKey.get(key);
    if (!g) {
      g = { key, label, items: [] };
      byKey.set(key, g);
      groups.push(g);
    }
    g.items.push(item);
  };

  for (const s of scenarios) {
    switch (groupBy) {
      case "none":
        push("all", "All scenarios", s);
        break;
      case "source":
        push(slugify(s.source.name), s.source.label, s);
        break;
      case "status":
        push(s.status, STATUS_LABEL[s.status] ?? s.status, s);
        break;
      case "tag": {
        if (s.tags.length === 0) {
          push("untagged", "Untagged", s);
          break;
        }
        for (const t of s.tags) push(slugify(t), t, s);
        break;
      }
      case "feature":
      default: {
        const key = slugify(`${s.feature.title} ${s.feature.sourceFile}`);
        push(key, s.feature.title || s.feature.sourceFile, s);
      }
    }
  }
  return groups;
}
