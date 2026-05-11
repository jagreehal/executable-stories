import type { ReportDocTag } from "executable-stories-formatters";

export function DocTag({ entry }: { entry: ReportDocTag }) {
  return (
    <ul className="es-doc es-tags" aria-label="Tags">
      {entry.names.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  );
}
