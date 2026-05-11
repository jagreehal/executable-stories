import type { ReportDocEntry } from "executable-stories-formatters";
import { DocEntry } from "./doc/DocEntry";

export interface ReportDocEntriesProps {
  entries: readonly ReportDocEntry[];
}

export function ReportDocEntries({ entries }: ReportDocEntriesProps) {
  if (entries.length === 0) return null;
  return (
    <>
      {entries.map((entry, i) => (
        <DocEntry key={i} entry={entry} />
      ))}
    </>
  );
}
