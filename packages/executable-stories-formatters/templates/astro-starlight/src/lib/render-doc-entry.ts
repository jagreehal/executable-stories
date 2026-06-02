/**
 * Pure doc-entry → HTML renderer for the Scenario Explorer.
 *
 * The Explorer builds its detail pane from the story report at runtime; this is
 * the string-building logic behind it, kept DOM-free so it can be unit-tested
 * and so the page file stays a thin shell. Markdown/diagrams/code are emitted as
 * placeholder markup (`data-md`, `.mermaid`, `language-*`) that the Explorer
 * hydrates with the bundled marked/mermaid/highlight.js libraries.
 *
 * Mirrors the doc kinds in the formatter's HTML renderer
 * (src/formatters/html/renderers/doc-entries.ts) but emits the Explorer's own
 * card markup. `tag` is intentionally skipped — tags render as header pills.
 */

/** Loose structural shape of a story-report doc entry (template is decoupled from the package types). */
export interface DocEntry {
  kind: string;
  text?: string;
  label?: string;
  value?: unknown;
  lang?: string;
  content?: string;
  columns?: string[];
  rows?: string[][];
  url?: string;
  title?: string;
  markdown?: string;
  code?: string;
  path?: string;
  alt?: string;
  poster?: string;
  caption?: string;
  type?: string;
  data?: unknown;
  children?: DocEntry[];
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const isRemote = (p: string): boolean => /^(?:https?:|data:)/i.test(p);
const isWindowsFsPath = (p: string): boolean => /^(?:[A-Za-z]:[\\/]|\\\\)/.test(p);

const mediaCaption = (text: string | undefined): string =>
  text ? `<div class="doc-media__caption">${escapeHtml(text)}</div>` : "";

const broken = (kind: string, p: string): string =>
  `<div class="doc-media doc-media--broken">${kind} unavailable<code>${escapeHtml(p)}</code></div>`;

const renderScreenshot = (entry: DocEntry): string => {
  const path = entry.path ?? "";
  if (isWindowsFsPath(path)) return broken("Screenshot", path);
  return `<div class="doc-media"><img src="${escapeHtml(path)}" alt="${escapeHtml(
    entry.alt ?? "Screenshot",
  )}" loading="lazy" />${mediaCaption(entry.alt)}</div>`;
};

const renderVideo = (entry: DocEntry): string => {
  const path = entry.path ?? "";
  if (!isRemote(path) && isWindowsFsPath(path)) return broken("Video", path);
  const poster = entry.poster ? ` poster="${escapeHtml(entry.poster)}"` : "";
  return `<div class="doc-media"><video controls preload="metadata"${poster} src="${escapeHtml(
    path,
  )}">Your browser cannot play this video.</video>${mediaCaption(entry.caption)}</div>`;
};

/** A labelled card wrapper used by most doc kinds. */
const labelled = (label: string, bodyHtml: string): string =>
  `<div class="doc-entry"><div class="doc-entry__label">${escapeHtml(
    label,
  )}</div><div class="doc-entry__body">${bodyHtml}</div></div>`;

const renderVisualCustom = (data: Record<string, unknown>): string => {
  const img = (src: unknown, label: string): string =>
    typeof src === "string"
      ? `<div class="doc-visual-item"><div class="doc-visual-label">${escapeHtml(
          label,
        )}</div><img src="${escapeHtml(src)}" alt="${escapeHtml(label)}" /></div>`
      : "";
  return labelled(
    `Visual check · ${escapeHtml(typeof data.status === "string" ? data.status : "unknown")}`,
    `<div class="doc-visual-grid">${img(data.baseline, "Baseline")}${img(data.actual, "Actual")}${img(
      data.diff,
      "Diff",
    )}</div>`,
  );
};

const RENDERERS: Record<string, (doc: DocEntry) => string> = {
  // Tags already render as pills in the header — skip the noise.
  tag: () => "",
  note: (doc) => `<div class="doc-entry"><div class="doc-note">${escapeHtml(doc.text)}</div></div>`,
  kv: (doc) => {
    const value = typeof doc.value === "string" ? doc.value : JSON.stringify(doc.value, null, 2);
    return `<div class="doc-entry"><div class="doc-kv"><span class="doc-kv__label">${escapeHtml(
      doc.label,
    )}</span><span class="doc-kv__value">${escapeHtml(value)}</span></div></div>`;
  },
  code: (doc) => {
    const langClass = doc.lang ? ` class="language-${escapeHtml(doc.lang)}"` : "";
    return labelled(
      doc.label || doc.lang || "code",
      `<pre><code${langClass}>${escapeHtml(doc.content)}</code></pre>`,
    );
  },
  table: (doc) => {
    const head = (doc.columns ?? []).map((c) => `<th>${escapeHtml(c)}</th>`).join("");
    const body = (doc.rows ?? [])
      .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
      .join("");
    return labelled(
      doc.label || "table",
      `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`,
    );
  },
  link: (doc) =>
    `<div class="doc-entry"><a class="doc-link-a" href="${escapeHtml(
      doc.url,
    )}" target="_blank" rel="noopener noreferrer">${escapeHtml(doc.label || doc.url)}</a></div>`,
  section: (doc) =>
    labelled(
      doc.title || "section",
      `<div class="doc-section-content" data-md="${escapeHtml(
        encodeURIComponent(doc.markdown ?? ""),
      )}"><pre>${escapeHtml(doc.markdown ?? "")}</pre></div>`,
    ),
  mermaid: (doc) =>
    labelled(doc.title || "diagram", `<pre class="mermaid">${escapeHtml(doc.code ?? "")}</pre>`),
  screenshot: (doc) => `<div class="doc-entry"><div class="doc-entry__body">${renderScreenshot(doc)}</div></div>`,
  video: (doc) => `<div class="doc-entry"><div class="doc-entry__body">${renderVideo(doc)}</div></div>`,
  custom: (doc) =>
    doc.type === "visual" && doc.data && typeof doc.data === "object"
      ? renderVisualCustom(doc.data as Record<string, unknown>)
      : labelled(doc.type || "custom", `<pre><code>${escapeHtml(JSON.stringify(doc.data, null, 2))}</code></pre>`),
};

export function renderDocEntry(doc: DocEntry): string {
  let html = RENDERERS[doc.kind]?.(doc) ?? "";
  if (html && doc.children && doc.children.length > 0) {
    const childHtml = doc.children.map(renderDocEntry).join("");
    if (childHtml) html += `<div class="doc-children">${childHtml}</div>`;
  }
  return html;
}

export function renderDocs(docs: DocEntry[] | undefined): string {
  if (!docs?.length) return '<p class="meta">No docs attached.</p>';
  return docs.map(renderDocEntry).join("") || '<p class="meta">No docs attached.</p>';
}
