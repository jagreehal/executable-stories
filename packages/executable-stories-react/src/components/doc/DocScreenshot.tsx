import type { ReportDocScreenshot } from "executable-stories-core";

export function DocScreenshot({ entry }: { entry: ReportDocScreenshot }) {
  return (
    <figure className="my-3">
      <img
        src={entry.path}
        alt={entry.alt ?? ""}
        loading="lazy"
        className="max-w-full rounded-md border border-border"
      />
      {entry.alt ? <figcaption className="mt-1.5 text-xs text-muted-foreground">{entry.alt}</figcaption> : null}
    </figure>
  );
}
