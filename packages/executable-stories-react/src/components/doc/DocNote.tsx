import type { ReportDocNote } from "executable-stories-formatters";

export function DocNote({ entry }: { entry: ReportDocNote }) {
  return <p className="es-doc es-doc-note">{entry.text}</p>;
}
