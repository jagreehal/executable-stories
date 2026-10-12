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

/** The URLs an attachment's bytes load from; undefined where its location fails the scheme checks. */
function attachmentUrls(att: ReportAttachment): { href?: string; imageSrc?: string } {
  // An external body holds the file's location, so it goes through the
  // same scheme checks as any other report-sourced URL.
  const dataUri = att.external
    ? undefined
    : att.contentEncoding === "BASE64"
      ? `data:${att.mediaType};base64,${att.body}`
      : `data:${att.mediaType},${encodeURIComponent(att.body)}`;
  return { href: dataUri ?? safeUrl(att.body), imageSrc: dataUri ?? safeImageUrl(att.body) };
}

/**
 * A failed screenshot comparison attaches `<stem>-expected.png`,
 * `-actual.png` and `-diff.png` (Playwright's `toHaveScreenshot` and e2e's
 * both name them so). An unstable-screen failure adds `-previous.png`.
 */
const COMPARISON = /^(.*)-(expected|actual|diff|previous)\.png$/i;
const ROLE_ORDER = ["expected", "actual", "diff", "previous"] as const;
type Role = (typeof ROLE_ORDER)[number];

interface Comparison {
  stem: string;
  images: { role: Role; att: ReportAttachment }[];
}

/** Splits comparisons (two or more images sharing a stem) from the rest, keeping order. */
function splitComparisons(attachments: ReportAttachment[]): { comparisons: Comparison[]; rest: ReportAttachment[] } {
  const byStem = new Map<string, Comparison>();
  for (const att of attachments) {
    const match = att.mediaType.startsWith("image/") ? COMPARISON.exec(att.name) : null;
    if (!match) continue;
    const comparison = byStem.get(match[1]!) ?? { stem: match[1]!, images: [] };
    comparison.images.push({ role: match[2]!.toLowerCase() as Role, att });
    byStem.set(comparison.stem, comparison);
  }
  const comparisons = [...byStem.values()].filter((c) => c.images.length > 1);
  for (const c of comparisons) c.images.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
  const grouped = new Set(comparisons.flatMap((c) => c.images.map((i) => i.att)));
  return { comparisons, rest: attachments.filter((att) => !grouped.has(att)) };
}

function ScreenshotComparison({ comparison }: { comparison: Comparison }) {
  const label = `Screenshot comparison: ${comparison.stem}`;
  return (
    <div role="group" aria-label={label} className="rounded-md border border-border p-2">
      <p className="m-0 mb-2 text-xs font-medium">{label}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {comparison.images.map(({ role, att }) => {
          const { imageSrc } = attachmentUrls(att);
          return (
            <figure key={role} className="m-0">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={`${comparison.stem} ${role}`}
                  loading="lazy"
                  className="max-w-full rounded-md border border-border"
                />
              ) : null}
              <figcaption className="mt-1 text-xs text-muted-foreground capitalize">{role}</figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Renders scenario attachments. Images embed inline; text documents preview
 * above their download link; other types get a labelled download link. An
 * `external` attachment links to its file path and shows no preview. A
 * screenshot comparison's images render side by side.
 */
export function ReportAttachments({ attachments }: { attachments: ReportAttachment[] }) {
  if (attachments.length === 0) return null;
  const { comparisons, rest } = splitComparisons(attachments);
  return (
    // role="group" (not a labelled <section>) so multiple scenarios' attachment
    // blocks don't create duplicate "Attachments" region landmarks.
    <div role="group" aria-label="Attachments" className="mt-3 flex flex-col gap-2">
      {comparisons.map((c) => (
        <ScreenshotComparison key={c.stem} comparison={c} />
      ))}
      {rest.map((att, i) => {
        const { href, imageSrc } = attachmentUrls(att);
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
