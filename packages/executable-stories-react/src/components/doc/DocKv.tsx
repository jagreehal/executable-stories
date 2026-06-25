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

export function DocKv({ entry }: { entry: ReportDocKv }) {
  return (
    <dl className="my-2 flex flex-wrap items-baseline gap-x-2 text-sm">
      <dt className="font-semibold text-muted-foreground">{entry.label}</dt>
      <dd className="font-mono text-foreground">{formatValue(entry.value)}</dd>
    </dl>
  );
}
