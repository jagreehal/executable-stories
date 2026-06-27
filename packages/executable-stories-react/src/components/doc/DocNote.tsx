import type { ReportDocNote } from "executable-stories-core";

export function DocNote({ entry }: { entry: ReportDocNote }) {
  return <p className="my-2 text-sm text-muted-foreground">{entry.text}</p>;
}
