import { marked } from "marked";
import { safeUrl } from "./url";

/**
 * Best-effort sanitizer for marked-generated HTML. The markdown we render is
 * authored in test source (developer-trusted), so this is defense-in-depth,
 * not a hard boundary against hostile input. It:
 *   - drops <script>/<style> and other active elements (iframe/object/embed/form)
 *   - strips on* event-handler attributes
 *   - neutralizes any non-http(s) scheme on href/src via the shared `safeUrl`
 *     allow-list (covers javascript:/data:/vbscript:/file:, not just javascript:)
 *
 * It is NOT a substitute for a full HTML sanitizer (it won't catch entity-
 * obfuscated schemes). For untrusted markdown, supply your own renderer.
 */
export function safeMarkdownHtml(markdown: string): string {
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

/**
 * Strip the leading indentation a template literal picks up from its source.
 *
 * Narratives are written inline in test files, so they arrive indented to match
 * the surrounding code. Left alone, four spaces make Markdown render the whole
 * paragraph as a code block.
 */
export function dedent(text: string): string {
  const lines = text.replace(/\t/g, "  ").split("\n");
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.length - line.trimStart().length);
  const shortest = indents.length > 0 ? Math.min(...indents) : 0;
  return lines
    .map((line) => line.slice(shortest))
    .join("\n")
    .trim();
}

function neutralizeUrl(value: string): string {
  return safeUrl(value) ?? "#";
}
