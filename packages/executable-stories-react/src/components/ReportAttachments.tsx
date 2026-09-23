import type { ReactNode } from "react";
import type { ReportAttachment } from "executable-stories-core";
import { safeMarkdownHtml } from "../lib/markdown";
import { safeImageUrl, safeUrl } from "../lib/url";
import { DocHtml } from "./doc/DocHtml";

/** The body as UTF-8 text, or undefined when a base64 body does not decode. */
function attachmentText(att: ReportAttachment): string | undefined {
  if (att.contentEncoding !== "BASE64") return att.body;
  try {
    return new TextDecoder().decode(Uint8Array.from(atob(att.body), (c) => c.charCodeAt(0)));
  } catch {
    return undefined;
  }
}

/**
 * Previews text documents: plain text as-is, markdown through the `section`
 * sanitiser, HTML in the sandboxed `story.html` frame. Other types get none.
 */
function preview(att: ReportAttachment): ReactNode {
  // `text/plain; charset=utf-8` is still text/plain.
  const type = att.mediaType.split(";")[0]!.trim().toLowerCase();
  const text = attachmentText(att);
  if (text === undefined) return null;
  if (type === "text/plain") {
    return (
      <pre className="max-h-96 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
        {text}
      </pre>
    );
  }
  if (type === "text/markdown") {
    return (
      <div
        className="es-doc-prose prose prose-sm max-w-none rounded-md border border-border p-3"
        dangerouslySetInnerHTML={{ __html: safeMarkdownHtml(text) }}
      />
    );
  }
  if (type === "text/html") {
    return <DocHtml entry={{ kind: "html", content: text, title: att.name, phase: "runtime" }} />;
  }
  return null;
}

/**
 * Renders scenario attachments. Images embed inline; text documents preview
 * above their download link; other types get a labelled download link. An
 * `external` attachment links to its file path and shows no preview.
 */
export function ReportAttachments({ attachments }: { attachments: ReportAttachment[] }) {
  if (attachments.length === 0) return null;
  return (
    // role="group" (not a labelled <section>) so multiple scenarios' attachment
    // blocks don't create duplicate "Attachments" region landmarks.
    <div role="group" aria-label="Attachments" className="mt-3 flex flex-col gap-2">
      {attachments.map((att, i) => {
        // An external body holds the file's location, so it goes through the
        // same scheme checks as any other report-sourced URL.
        const dataUri = att.external
          ? undefined
          : att.contentEncoding === "BASE64"
            ? `data:${att.mediaType};base64,${att.body}`
            : `data:${att.mediaType},${encodeURIComponent(att.body)}`;
        const href = dataUri ?? safeUrl(att.body);
        const imageSrc = dataUri ?? safeImageUrl(att.body);
        const isImage = att.mediaType.startsWith("image/") && imageSrc !== undefined;
        return (
          <figure key={`${att.name}-${i}`} className="m-0">
            {isImage ? (
              <>
                <img
                  src={imageSrc}
                  alt={att.name}
                  loading="lazy"
                  className="max-w-full rounded-md border border-border"
                />
                <figcaption className="mt-1 text-xs text-muted-foreground">{att.name}</figcaption>
              </>
            ) : (
              <>
                {att.external ? null : preview(att)}
                <a
                  href={href}
                  download={att.name}
                  className="text-xs text-link underline underline-offset-2"
                >
                  {att.name} <span className="text-muted-foreground">({att.mediaType})</span>
                </a>
              </>
            )}
          </figure>
        );
      })}
    </div>
  );
}
