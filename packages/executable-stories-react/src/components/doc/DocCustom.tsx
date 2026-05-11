import type { ReportDocCustom } from "executable-stories-formatters";
import { useCustomRenderers } from "../../hooks/useRenderers";

export function DocCustom({ entry }: { entry: ReportDocCustom }) {
  const renderers = useCustomRenderers();
  const renderer = renderers[entry.type];
  if (renderer) {
    return <>{renderer(entry)}</>;
  }
  return (
    <div className="es-doc es-doc-custom" data-type={entry.type}>
      <p className="es-doc-custom-type">{entry.type}</p>
      <pre>{safeStringify(entry.data)}</pre>
    </div>
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
