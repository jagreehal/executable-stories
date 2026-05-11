import type { ReportDocMermaid } from "executable-stories-formatters";
import { useBuiltinRenderers } from "../../hooks/useRenderers";

/**
 * Renders mermaid source as a semantic <pre data-mermaid> by default.
 *
 * AI agents and screen readers get the raw source. To render the diagram
 * visually, supply a `renderers.mermaid` prop with a client-only component
 * (e.g., one that dynamically imports the mermaid library on mount).
 */
export function DocMermaid({ entry }: { entry: ReportDocMermaid }) {
  const renderers = useBuiltinRenderers();
  if (renderers.mermaid) {
    return <>{renderers.mermaid(entry)}</>;
  }
  return (
    <figure
      className="es-doc es-doc-mermaid"
      aria-label={entry.title ?? "Diagram"}
    >
      {entry.title ? <figcaption>{entry.title}</figcaption> : null}
      <pre data-mermaid>{entry.code}</pre>
    </figure>
  );
}
