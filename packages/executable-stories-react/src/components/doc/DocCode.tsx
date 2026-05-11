import type { ReportDocCode } from "executable-stories-formatters";
import { useBuiltinRenderers } from "../../hooks/useRenderers";

export function DocCode({ entry }: { entry: ReportDocCode }) {
  const renderers = useBuiltinRenderers();
  if (renderers.code) {
    return <>{renderers.code(entry)}</>;
  }
  return (
    <figure className="es-doc es-doc-code">
      <figcaption>{entry.label}</figcaption>
      <pre>
        <code className={entry.lang ? `language-${entry.lang}` : undefined}>
          {entry.content}
        </code>
      </pre>
    </figure>
  );
}
