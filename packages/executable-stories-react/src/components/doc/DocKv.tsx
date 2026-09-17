import type { ReportDocKv } from "executable-stories-core";

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Consecutive `story.kv()` entries share one two-column grid so the values
 * line up whatever the label lengths; a lone entry is just a one-row grid.
 * `ReportDocEntries` groups the runs.
 */
export function DocKv({ entries }: { entries: readonly ReportDocKv[] }) {
  return (
    <dl className="my-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
      {entries.map((entry, i) => (
        <div key={i} className="contents">
          <dt className="font-semibold text-muted-foreground">{entry.label}</dt>
          <dd className="min-w-0 break-words font-mono text-foreground">{formatValue(entry.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
