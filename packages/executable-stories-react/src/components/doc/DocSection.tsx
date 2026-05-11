import { marked } from "marked";
import type { ReportDocSection } from "executable-stories-formatters";
import { useBuiltinRenderers } from "../../hooks/useRenderers";

/**
 * Strips the most common dangerous patterns from marked-generated HTML:
 *   - <script>...</script> blocks
 *   - <style>...</style> blocks
 *   - on* event-handler attributes
 *   - javascript: URLs on href / src
 *
 * Not a substitute for a full HTML sanitizer (DOMPurify, sanitize-html).
 * For high-untrust input, supply `renderers.section` with your own sanitizer.
 */
function safeMarkdownHtml(markdown: string): string {
  const raw = marked.parse(markdown, { async: false }) as string;
  return raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*'\s*javascript:[^']*'/gi, "$1='#'");
}

export function DocSection({ entry }: { entry: ReportDocSection }) {
  const renderers = useBuiltinRenderers();
  if (renderers.section) {
    return <>{renderers.section(entry)}</>;
  }
  const html = safeMarkdownHtml(entry.markdown);
  return (
    <section className="es-doc es-doc-section" aria-label={entry.title}>
      {entry.title ? <h4 className="es-doc-section-title">{entry.title}</h4> : null}
      <div
        className="es-doc-section-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
