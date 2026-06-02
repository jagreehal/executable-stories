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

  // Try to inline as a data URI; undefined means the file is missing/unreadable.
  const embedAttempted =
    !isRemote && embedEnabled && !!deps.readScreenshot;
  const inlined = embedAttempted
    ? deps.readScreenshot!(entry.path)
    : undefined;

  // For absolute filesystem paths we couldn't inline, an `<img src>` would 404
  // when the HTML is opened standalone (e.g. `/home/runner/work/...` resolved
  // against the page's host). Render a placeholder instead of a broken image —
  // but only when embedding was actually attempted. If the caller didn't
  // supply a readScreenshot hook (or explicitly set embedScreenshots: false),
  // they're handling assets externally; keep the legacy <img>.
  // Catches POSIX (/foo, \foo) and Windows drive-letter (C:\foo) absolute paths.
  const isAbsoluteFsPath =
    !isRemote && /^(?:[/\\]|[A-Za-z]:[/\\])/.test(entry.path);
  if (embedAttempted && inlined === undefined && isAbsoluteFsPath) {
    const captionHtml = entry.alt
      ? `<div class="doc-screenshot-caption">${deps.escapeHtml(entry.alt)}</div>`
      : "";
    return `<div class="doc-screenshot doc-screenshot-missing">
  <div class="doc-screenshot-missing-label">Screenshot unavailable</div>
  <div class="doc-screenshot-missing-path">${deps.escapeHtml(entry.path)}</div>
  ${captionHtml}
</div>`;
  }

  const src = inlined ?? entry.path;
  return `<div class="doc-screenshot">
  <img src="${deps.escapeHtml(src)}" alt="${deps.escapeHtml(alt)}" class="doc-screenshot-img" />
  ${entry.alt ? `<div class="doc-screenshot-caption">${deps.escapeHtml(entry.alt)}</div>` : ""}
</div>`;
}

export function renderDocVideo(
  entry: Extract<DocEntry, { kind: "video" }>,
  deps: DocEntryDeps,
): string {
  const isRemote = /^(?:https?:|data:)/i.test(entry.path);
  // Video bytes are large — never inline as a data URI. A relative path
  // resolves alongside the report; an absolute filesystem path would 404 when
  // the report is opened on another machine, so render a placeholder instead
  // of a broken <video> tag. Matches the screenshot/attachment behaviour.
  const isAbsoluteFsPath =
    !isRemote && /^(?:[/\\]|[A-Za-z]:[/\\])/.test(entry.path);
  const captionHtml = entry.caption
    ? `<div class="doc-video-caption">${deps.escapeHtml(entry.caption)}</div>`
    : "";

  if ((deps.embedScreenshots ?? true) && isAbsoluteFsPath) {
    return `<div class="doc-video doc-video-missing">
  <div class="doc-video-missing-label">Video unavailable</div>
  <div class="doc-video-missing-path">${deps.escapeHtml(entry.path)}</div>
  ${captionHtml}
</div>`;
  }

  const poster = entry.poster ? ` poster="${deps.escapeHtml(entry.poster)}"` : "";
  return `<div class="doc-video">
  <video class="doc-video-player" controls preload="metadata"${poster} src="${deps.escapeHtml(entry.path)}"></video>
  ${captionHtml}
</div>`;
}

export function renderDocCustom(
  entry: Extract<DocEntry, { kind: "custom" }>,
  deps: DocEntryDeps,
): string {
  if (entry.type === "visual" && entry.data && typeof entry.data === "object") {
    const data = entry.data as Record<string, unknown>;
    const status = typeof data.status === "string" ? data.status : "unknown";
    const baseline = typeof data.baseline === "string" ? data.baseline : undefined;
    const actual = typeof data.actual === "string" ? data.actual : undefined;
    const diff = typeof data.diff === "string" ? data.diff : undefined;

    const maybeImg = (src?: string, label?: string) =>
      src
        ? `<div class="doc-visual-item"><div class="doc-visual-label">${deps.escapeHtml(label ?? "")}</div><img src="${deps.escapeHtml(src)}" alt="${deps.escapeHtml(label ?? "visual image")}" class="doc-screenshot-img" /></div>`
        : "";

    return `<div class="doc-visual">
  <div class="doc-visual-header">Visual Check <span class="doc-visual-status">${deps.escapeHtml(status)}</span></div>
  <div class="doc-visual-grid">
    ${maybeImg(baseline, "Baseline")}
    ${maybeImg(actual, "Actual")}
    ${maybeImg(diff, "Diff")}
  </div>
</div>`;
  }

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
    case "video":
      html = renderDocVideo(entry, deps);
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
