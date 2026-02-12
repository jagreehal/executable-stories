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

    if (isImage && deps.embedScreenshots && isBase64) {
      return `
<div class="attachment">
  ${deps.escapeHtml(att.name)}
  <img class="attachment-image" src="data:${att.mediaType};base64,${att.body}" alt="${deps.escapeHtml(att.name)}" />
</div>`;
    }

    if (isVideo && deps.embedScreenshots) {
      const src = isBase64
        ? `data:${att.mediaType};base64,${att.body}`
        : att.body;
      return `
<div class="attachment">
  ${deps.escapeHtml(att.name)}
  <video class="attachment-video" controls src="${deps.escapeHtml(src)}"></video>
</div>`;
    }

    const href = isBase64
      ? `data:${att.mediaType};base64,${att.body}`
      : att.body;

    return `<a class="attachment" href="${deps.escapeHtml(href)}">${deps.escapeHtml(att.name)}</a>`;
  });

  return `<div class="attachments">${items.join("")}</div>`;
}
