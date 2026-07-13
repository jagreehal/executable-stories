import { marked } from "marked";
import type { ReportDocSection } from "executable-stories-core";
import { useBuiltinRenderers } from "../../hooks/useRenderers";
import { safeUrl } from "../../lib/url";

/**
 * Best-effort sanitizer for marked-generated HTML. `section` markdown is
 * authored in the test source (developer-trusted), so this is defense-in-depth,
 * not a hard boundary against hostile input. It:
 *   - drops <script>/<style> and other active elements (iframe/object/embed/form)
 *   - strips on* event-handler attributes
 *   - neutralizes any non-http(s) scheme on href/src via the shared `safeUrl`
 *     allow-list (covers javascript:/data:/vbscript:/file:, not just javascript:)
 *
 * It is NOT a substitute for a full HTML sanitizer (it won't catch entity-
 * obfuscated schemes). For untrusted markdown, supply `renderers.section` with
 * your own sanitizer.
 */
function neutralizeUrl(value: string): string {
  return safeUrl(value) ?? "#";
}

function safeMarkdownHtml(markdown: string): string {
  const raw = marked.parse(markdown, { async: false }) as string;
  return raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(?:iframe|object|embed|form|base)\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|src)\s*=\s*"([^"]*)"/gi, (_m, attr, val) => `${attr}="${neutralizeUrl(val)}"`)
    .replace(/(href|src)\s*=\s*'([^']*)'/gi, (_m, attr, val) => `${attr}='${neutralizeUrl(val)}'`);
}

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
