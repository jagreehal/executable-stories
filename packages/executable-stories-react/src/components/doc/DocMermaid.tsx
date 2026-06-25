import type { Ref } from "react";
import type { ReportDocMermaid } from "executable-stories-core";
import { useBuiltinRenderers } from "../../hooks/useRenderers";

/**
 * The raw mermaid source as a semantic `<pre data-mermaid>`. This is the
 * default render and the universal fallback: AI agents, screen readers, and
 * no-JS views all get the readable source. `<MermaidDiagram>` upgrades this to
 * a drawn diagram on the client.
 */
export function MermaidSource({ entry, ref }: { entry: ReportDocMermaid; ref?: Ref<HTMLElement> }) {
  return (
    <figure ref={ref} className="my-3" aria-label={entry.title ?? "Diagram"}>
      {entry.title ? (
        <figcaption className="mb-1.5 text-xs font-medium text-muted-foreground">{entry.title}</figcaption>
      ) : null}
      <pre
        data-mermaid
        tabIndex={0}
        className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground"
      >
        {entry.code}
      </pre>
    </figure>
  );
}

/**
 * Renders mermaid source as a semantic `<pre data-mermaid>` by default.
 *
 * To draw the diagram, supply a `renderers.mermaid` prop — e.g. the shipped
 * `MermaidDiagram` (`renderers={{ mermaid: (e) => <MermaidDiagram entry={e} /> }}`).
 */
export function DocMermaid({ entry }: { entry: ReportDocMermaid }) {
  const renderers = useBuiltinRenderers();
  if (renderers.mermaid) {
    return <>{renderers.mermaid(entry)}</>;
  }
  return <MermaidSource entry={entry} />;
}
