import type { ReportDocVideo } from "executable-stories-core";
import { safeUrl } from "../../lib/url";

/**
 * Renders a video doc entry. Video bytes are large and never inlined; `path` is
 * a URL or a path that resolves alongside the report. Both `path` and `poster`
 * are adapter-supplied, so they go through the same scheme allow-list as the
 * DocHtml iframe src (no `javascript:`/`data:` URLs reach the DOM).
 */
export function DocVideo({ entry }: { entry: ReportDocVideo }) {
  const src = safeUrl(entry.path);
  const poster = safeUrl(entry.poster);
  return (
    <figure className="my-3">
      <video
        controls
        preload="metadata"
        {...(src ? { src } : {})}
        {...(poster ? { poster } : {})}
        className="max-w-full rounded-md border border-border"
      />
      {entry.caption ? (
        <figcaption className="mt-1 text-xs text-muted-foreground">{entry.caption}</figcaption>
      ) : null}
    </figure>
  );
}
