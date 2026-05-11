import type { ReportDocScreenshot } from "executable-stories-formatters";

export function DocScreenshot({ entry }: { entry: ReportDocScreenshot }) {
  return (
    <figure className="es-doc es-doc-screenshot">
      <img src={entry.path} alt={entry.alt ?? ""} loading="lazy" />
      {entry.alt ? <figcaption>{entry.alt}</figcaption> : null}
    </figure>
  );
}
