/**
 * Render doc entries (fn(args, deps)).
 * One function per doc kind + dispatcher renderDocEntry.
 */

import type { DocEntry } from "../../../types/story";

export interface DocEntryDeps {
  escapeHtml: (str: string) => string;
  syntaxHighlighting: boolean;
  markdownEnabled: boolean;
  mermaidEnabled: boolean;
  /** When true, attempt to inline local screenshot files as data URIs. Default: true */
  embedScreenshots?: boolean;
  /** Read a local image file and return a `data:` URI; return undefined to leave the path untouched. */
  readScreenshot?: (path: string) => string | undefined;
}

export function renderDocNote(
  entry: Extract<DocEntry, { kind: "note" }>,
  deps: DocEntryDeps,
): string {
  return `<div class="doc-note">${deps.escapeHtml(entry.text)}</div>`;
}

export function renderDocTag(
  entry: Extract<DocEntry, { kind: "tag" }>,
  deps: DocEntryDeps,
): string {
  const tags = entry.names
    .map((t) => `<span class="doc-tag-item">${deps.escapeHtml(t)}</span>`)
    .join("");
  return `<div class="doc-tag">${tags}</div>`;
}

export function renderDocKv(
  entry: Extract<DocEntry, { kind: "kv" }>,
  deps: DocEntryDeps,
): string {
  const valueStr =
    typeof entry.value === "string"
      ? entry.value
      : JSON.stringify(entry.value, null, 2);
  return `<div class="doc-kv">
  <span class="doc-kv-label">${deps.escapeHtml(entry.label)}:</span>
  <span class="doc-kv-value">${deps.escapeHtml(valueStr)}</span>
</div>`;
}

export function renderDocCode(
  entry: Extract<DocEntry, { kind: "code" }>,
  deps: DocEntryDeps,
): string {
  const langBadge = entry.lang
    ? `<span class="doc-code-lang">${deps.escapeHtml(entry.lang)}</span>`
    : "";
  const langClass =
    deps.syntaxHighlighting && entry.lang
      ? ` class="language-${deps.escapeHtml(entry.lang)}"`
      : "";
  return `<div class="doc-code">
  <div class="doc-code-header">
    <span class="doc-code-label">${deps.escapeHtml(entry.label)}</span>
    ${langBadge}
  </div>
  <pre class="doc-code-content"><code${langClass}>${deps.escapeHtml(entry.content)}</code></pre>
</div>`;
}

export function renderDocTable(
  entry: Extract<DocEntry, { kind: "table" }>,
  deps: DocEntryDeps,
): string {
  const headers = entry.columns
    .map((c) => `<th>${deps.escapeHtml(c)}</th>`)
    .join("");
  const rows = entry.rows
    .map((r) =>
      `<tr>${r.map((c) => `<td>${deps.escapeHtml(c)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<div class="doc-table">
  <div class="doc-table-label">${deps.escapeHtml(entry.label)}</div>
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
}

export function renderDocLink(
  entry: Extract<DocEntry, { kind: "link" }>,
  deps: DocEntryDeps,
): string {
  return `<div class="doc-link">
  <a href="${deps.escapeHtml(entry.url)}" target="_blank" rel="noopener noreferrer">${deps.escapeHtml(entry.label)}</a>
</div>`;
}

export function renderDocSection(
  entry: Extract<DocEntry, { kind: "section" }>,
  deps: DocEntryDeps,
): string {
  if (deps.markdownEnabled) {
    const encodedMarkdown = btoa(encodeURIComponent(entry.markdown));
    return `<div class="doc-section doc-section-parsed">
  <div class="doc-section-title">${deps.escapeHtml(entry.title)}</div>
  <div class="doc-section-content" data-markdown="${encodedMarkdown}"></div>
</div>`;
  }
  return `<div class="doc-section">
  <div class="doc-section-title">${deps.escapeHtml(entry.title)}</div>
  <pre class="doc-section-content">${deps.escapeHtml(entry.markdown)}</pre>
</div>`;
}

export function renderDocMermaid(
  entry: Extract<DocEntry, { kind: "mermaid" }>,
  deps: DocEntryDeps,
): string {
  const title = entry.title
    ? `<div class="doc-mermaid-title">${deps.escapeHtml(entry.title)}</div>`
    : "";

  if (deps.mermaidEnabled) {
    return `<div class="doc-mermaid doc-mermaid-live">
  ${title}
  <pre class="mermaid">${deps.escapeHtml(entry.code)}</pre>
</div>`;
  }
  return `<div class="doc-mermaid">
  ${title}
  <pre class="doc-mermaid-code"><code>${deps.escapeHtml(entry.code)}</code></pre>
</div>`;
}

export function renderDocScreenshot(
  entry: Extract<DocEntry, { kind: "screenshot" }>,
  deps: DocEntryDeps,
): string {
  const alt = entry.alt ?? "Screenshot";
  const embedEnabled = deps.embedScreenshots ?? true;
  // Only attempt to embed local file paths — leave http(s)/data URIs alone.
  const isRemote = /^(?:https?:|data:)/i.test(entry.path);
  const src =
    embedEnabled && !isRemote && deps.readScreenshot
      ? (deps.readScreenshot(entry.path) ?? entry.path)
      : entry.path;
  return `<div class="doc-screenshot">
  <img src="${deps.escapeHtml(src)}" alt="${deps.escapeHtml(alt)}" class="doc-screenshot-img" />
  ${entry.alt ? `<div class="doc-screenshot-caption">${deps.escapeHtml(entry.alt)}</div>` : ""}
</div>`;
}

export function renderDocCustom(
  entry: Extract<DocEntry, { kind: "custom" }>,
  deps: DocEntryDeps,
): string {
  const dataStr = JSON.stringify(entry.data, null, 2);
  return `<div class="doc-custom">
  <div class="doc-custom-type">${deps.escapeHtml(entry.type)}</div>
  <pre class="doc-custom-data"><code>${deps.escapeHtml(dataStr)}</code></pre>
</div>`;
}

export function renderDocEntry(entry: DocEntry, deps: DocEntryDeps): string {
  let html: string;
  switch (entry.kind) {
    case "note":
      html = renderDocNote(entry, deps);
      break;
    case "tag":
      html = renderDocTag(entry, deps);
      break;
    case "kv":
      html = renderDocKv(entry, deps);
      break;
    case "code":
      html = renderDocCode(entry, deps);
      break;
    case "table":
      html = renderDocTable(entry, deps);
      break;
    case "link":
      html = renderDocLink(entry, deps);
      break;
    case "section":
      html = renderDocSection(entry, deps);
      break;
    case "mermaid":
      html = renderDocMermaid(entry, deps);
      break;
    case "screenshot":
      html = renderDocScreenshot(entry, deps);
      break;
    case "custom":
      html = renderDocCustom(entry, deps);
      break;
    default:
      html = "";
  }

  if (entry.children && entry.children.length > 0) {
    const childrenHtml = entry.children
      .map((child) => renderDocEntry(child, deps))
      .join("");
    html += `<div class="doc-children">${childrenHtml}</div>`;
  }

  return html;
}
