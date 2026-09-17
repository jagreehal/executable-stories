import type { ReportDocEntry, ReportDocKv } from "executable-stories-core";
import { DocEntry } from "./doc/DocEntry";
import { DocKv } from "./doc/DocKv";

export interface ReportDocEntriesProps {
  entries: readonly ReportDocEntry[];
}

export function ReportDocEntries({ entries }: ReportDocEntriesProps) {
  if (entries.length === 0) return null;
  // A run of adjacent kv entries renders as one aligned grid.
  const groups: (ReportDocEntry | ReportDocKv[])[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (entry.kind === "kv" && Array.isArray(last)) last.push(entry);
    else groups.push(entry.kind === "kv" ? [entry] : entry);
  }
  return (
    <>
      {groups.map((g, i) =>
        Array.isArray(g) ? <DocKv key={i} entries={g} /> : <DocEntry key={i} entry={g} />,
      )}
    </>
  );
}
