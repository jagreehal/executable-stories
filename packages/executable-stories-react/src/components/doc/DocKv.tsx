import type { ReportDocKv } from "executable-stories-formatters";

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

export function DocKv({ entry }: { entry: ReportDocKv }) {
  return (
    <dl className="es-doc es-doc-kv">
      <dt>{entry.label}</dt>
      <dd>{formatValue(entry.value)}</dd>
    </dl>
  );
}
