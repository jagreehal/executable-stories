import type { ReportDocVideo } from "executable-stories-core";
import { isLocalFsPath, safeUrl } from "../../lib/url";

/**
 * Renders a video doc entry. Video bytes are large and never inlined; `path` is
 * a URL or a path that resolves alongside the report. Both `path` and `poster`
 * are adapter-supplied, so they go through the same scheme allow-list as the
 * DocHtml iframe src (no `javascript:`/`data:` URLs reach the DOM).
 *
 * An absolute local filesystem path means the report's asset bundler
 * couldn't find/copy the file — a `<video src>` pointed at a runner-local
 * path would just fail to load, so show a placeholder instead.
 */
export function DocVideo({ entry }: { entry: ReportDocVideo }) {
  if (isLocalFsPath(entry.path)) {
    return (
      <figure className="my-3 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
        <div className="font-medium">Video unavailable</div>
        <div className="mt-1 break-all font-mono text-xs">{entry.path}</div>
        {entry.caption ? <figcaption className="mt-1.5 text-xs">{entry.caption}</figcaption> : null}
      </figure>
    );
  }

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
