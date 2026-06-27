import type { ReportDocCustom } from "executable-stories-core";
import { useCustomRenderers } from "../../hooks/useRenderers";

export function DocCustom({ entry }: { entry: ReportDocCustom }) {
  const renderers = useCustomRenderers();
  const renderer = renderers[entry.type];
  if (renderer) {
    return <>{renderer(entry)}</>;
  }
  return (
    <div className="my-2" data-type={entry.type}>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{entry.type}</p>
      <pre tabIndex={0} className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground">
        {safeStringify(entry.data)}
      </pre>
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
