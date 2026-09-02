import type { ReportDocHtml } from "executable-stories-core";
import { safeUrl } from "../../lib/url";

/**
 * Renders an embedded-HTML doc entry inside a SANDBOXED iframe. All embedded
 * HTML is untrusted, so the frame is `sandbox="allow-scripts"` only (no
 * allow-same-origin) — embedded scripts run (charts work) but can't touch the
 * report DOM, cookies, or storage. Inline `content` → srcdoc (keeps the report
 * self-contained); `url`/`path` → src (scheme-validated).
 */
export function DocHtml({ entry }: { entry: ReportDocHtml }) {
  const height = typeof entry.height === "number" ? `${entry.height}px` : (entry.height ?? "400px");
  const title = entry.title ?? "Embedded HTML";
  const safeHref = safeUrl(entry.url ?? entry.path);

  // Exactly one of content / url / path is set. A url/path with an unsafe
  // scheme yields no src (the figure still renders, just empty).
  const frameProps = entry.content !== undefined ? { srcDoc: entry.content } : { src: safeHref ?? "" };

  return (
    <figure className="my-3 overflow-hidden rounded-md border border-border">
      <figcaption className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <span>{entry.title ?? "HTML"}</span>
        {safeHref ? (
          <a
            href={safeHref}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Open in new tab"
            title="Open in new tab"
            className="text-primary"
          >
            ↗
          </a>
        ) : null}
      </figcaption>
      <iframe
        {...frameProps}
        sandbox="allow-scripts"
        loading="lazy"
        title={title}
        className="block w-full border-0"
        // Embedded HTML is authored standalone, so it assumes a light page. An
        // iframe with no background inherits the host's dark canvas (via the
        // report's `color-scheme`), leaving that authored dark text unreadable.
        style={{ height, colorScheme: "light", background: "#fff" }}
      />
    </figure>
  );
}
