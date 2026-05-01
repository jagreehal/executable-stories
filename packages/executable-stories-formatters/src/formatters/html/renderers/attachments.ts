/**
 * Render attachments section (fn(args, deps)).
 */

import type { Attachment } from "../../../types/test-result";

export interface RenderAttachmentsArgs {
  attachments: Attachment[];
}

export interface RenderAttachmentsDeps {
  escapeHtml: (str: string) => string;
  embedScreenshots: boolean;
}

export function renderAttachments(
  args: RenderAttachmentsArgs,
  deps: RenderAttachmentsDeps,
): string {
  if (args.attachments.length === 0) {
    return "";
  }

  const items = args.attachments.map((att) => {
    const isImage = att.mediaType.startsWith("image/");
    const isVideo = att.mediaType.startsWith("video/");
    const isBase64 = att.contentEncoding === "BASE64";

    // For non-embedded attachments, body holds either a relative path
    // (resolves alongside the HTML) or an absolute filesystem path that
    // would 404 when the report is opened standalone — e.g. an artifact
    // downloaded to a different machine. Render a placeholder for the
    // latter so we don't ship broken <video>/<img> tags. Detects POSIX
    // (/foo, \foo) and Windows drive-letter (C:\foo) absolute paths.
    //
    // Only kick in when embedding was actually requested (embedScreenshots:
    // true). If the caller explicitly set embedScreenshots: false they're
    // handling assets externally and want a plain link, not a placeholder.
    const isUnreachableFsPath =
      deps.embedScreenshots &&
      !isBase64 &&
      typeof att.body === "string" &&
      /^(?:[/\\]|[A-Za-z]:[/\\])/.test(att.body);

    if (isImage && deps.embedScreenshots && isBase64) {
      return `
<div class="attachment">
  ${deps.escapeHtml(att.name)}
  <img class="attachment-image" src="data:${att.mediaType};base64,${att.body}" alt="${deps.escapeHtml(att.name)}" />
</div>`;
    }

    if (isVideo && deps.embedScreenshots && !isUnreachableFsPath) {
      const src = isBase64
        ? `data:${att.mediaType};base64,${att.body}`
        : att.body;
      return `
<div class="attachment">
  ${deps.escapeHtml(att.name)}
  <video class="attachment-video" controls src="${deps.escapeHtml(src)}"></video>
</div>`;
    }

    if (isUnreachableFsPath) {
      return `
<div class="attachment attachment-unavailable">
  <div class="attachment-unavailable-label">${deps.escapeHtml(att.name)} unavailable</div>
  <div class="attachment-unavailable-path">${deps.escapeHtml(att.body)}</div>
</div>`;
    }

    const href = isBase64
      ? `data:${att.mediaType};base64,${att.body}`
      : att.body;

    return `<a class="attachment" href="${deps.escapeHtml(href)}">${deps.escapeHtml(att.name)}</a>`;
  });

  return `<div class="attachments">${items.join("")}</div>`;
}
