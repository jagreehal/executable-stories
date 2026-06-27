import type { ReportAttachment } from "executable-stories-core";

/**
 * Renders scenario attachments. Base64 images embed inline; everything else
 * becomes a labelled data-URI download link. Mirrors the report's attachments
 * block (which also inlines images and links other media).
 */
export function ReportAttachments({ attachments }: { attachments: ReportAttachment[] }) {
  if (attachments.length === 0) return null;
  return (
    // role="group" (not a labelled <section>) so multiple scenarios' attachment
    // blocks don't create duplicate "Attachments" region landmarks.
    <div role="group" aria-label="Attachments" className="mt-3 flex flex-col gap-2">
      {attachments.map((att, i) => {
        const dataUri =
          att.contentEncoding === "BASE64"
            ? `data:${att.mediaType};base64,${att.body}`
            : `data:${att.mediaType},${encodeURIComponent(att.body)}`;
        const isImage = att.mediaType.startsWith("image/");
        return (
          <figure key={`${att.name}-${i}`} className="m-0">
            {isImage ? (
              <>
                <img
                  src={dataUri}
                  alt={att.name}
                  loading="lazy"
                  className="max-w-full rounded-md border border-border"
                />
                <figcaption className="mt-1 text-xs text-muted-foreground">{att.name}</figcaption>
              </>
            ) : (
              <a
                href={dataUri}
                download={att.name}
                className="text-xs text-link underline underline-offset-2"
              >
                {att.name} <span className="text-muted-foreground">({att.mediaType})</span>
              </a>
            )}
          </figure>
        );
      })}
    </div>
  );
}
