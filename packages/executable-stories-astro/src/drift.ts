/**
 * Environment drift — pure logic behind the `/drift` page.
 *
 * When the site combines several run sources (staging vs production, service A
 * vs service B), the drift table shows every scenario's status per source side
 * by side and floats the mismatches to the top: behavior verified in one
 * environment but failing (or missing) in another is exactly the gap a
 * per-environment report hides. Derived entirely from the entries the loader
 * already stamps with their owning source — no new inputs.
 */
import type { TestStatus } from "executable-stories-core";

/** Entry shape the drift table needs (StoryEntryData satisfies it). */
export interface DriftEntryLike {
  id: string;
  title: string;
  slug: string;
  status: TestStatus;
  source: { name: string; label: string };
}

export interface DriftRow {
  /** Stable scenario id (the cross-source join key). */
  id: string;
  title: string;
  /** URL slug of the first entry seen, for the story-page link. */
  slug: string;
  /** Status per source name; undefined = scenario absent from that source. */
  statuses: Record<string, TestStatus | undefined>;
  /** True when the sources disagree (different statuses, or absent in some). */
  drifted: boolean;
}

export interface DriftReport {
  sources: Array<{ name: string; label: string }>;
  /** Drifted rows first (then by title); in-sync rows follow. */
  rows: DriftRow[];
  driftedCount: number;
}

export function extractDrift(entries: DriftEntryLike[]): DriftReport {
  const sources: Array<{ name: string; label: string }> = [];
  const sourceSeen = new Set<string>();
  for (const entry of entries) {
    if (sourceSeen.has(entry.source.name)) continue;
    sourceSeen.add(entry.source.name);
    sources.push({ name: entry.source.name, label: entry.source.label });
  }

  const byId = new Map<string, DriftRow>();
  for (const entry of entries) {
    let row = byId.get(entry.id);
    if (!row) {
      row = { id: entry.id, title: entry.title, slug: entry.slug, statuses: {}, drifted: false };
      byId.set(entry.id, row);
    }
    // A source reporting the same scenario twice keeps the worst status.
    const prior = row.statuses[entry.source.name];
    row.statuses[entry.source.name] = prior === "failed" ? prior : entry.status;
  }

  const rows = [...byId.values()];
  for (const row of rows) {
    const statuses = sources.map((s) => row.statuses[s.name]);
    row.drifted = new Set(statuses).size > 1;
  }
  rows.sort((a, b) => Number(b.drifted) - Number(a.drifted) || a.title.localeCompare(b.title));

  return { sources, rows, driftedCount: rows.filter((r) => r.drifted).length };
}
