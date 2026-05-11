import type { ReportDocLink } from "executable-stories-formatters";

export function DocLink({ entry }: { entry: ReportDocLink }) {
  return (
    <a
      className="es-doc es-doc-link"
      href={entry.url}
      rel="noreferrer noopener"
      target="_blank"
    >
      {entry.label}
    </a>
  );
}
