import type { ReportDocSection } from "executable-stories-core";
import { useBuiltinRenderers } from "../../hooks/useRenderers";
import { safeMarkdownHtml } from "../../lib/markdown";

export function DocSection({ entry }: { entry: ReportDocSection }) {
  const renderers = useBuiltinRenderers();
  if (renderers.section) {
    return <>{renderers.section(entry)}</>;
  }
  const html = safeMarkdownHtml(entry.markdown);
  return (
    <section className="my-3 text-sm" aria-label={entry.title}>
      {entry.title ? <h4 className="mb-1 font-semibold text-foreground">{entry.title}</h4> : null}
      <div
        className="es-doc-prose prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
