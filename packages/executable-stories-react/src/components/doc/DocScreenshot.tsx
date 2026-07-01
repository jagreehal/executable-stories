import type { ReportDocScreenshot } from "executable-stories-core";
import { isLocalFsPath, safeImageUrl } from "../../lib/url";

/**
 * A screenshot that's still an absolute local filesystem path by the time it
 * reaches this component means the report's asset bundler couldn't find the
 * file to inline/copy it (deleted, moved, or never captured — see
 * inlineScreenshotIfPossible in executable-stories-playwright). `<img src>`
 * would 404 against a path from the machine that generated the report, so
 * show a placeholder instead of a broken image.
 */
export function DocScreenshot({ entry }: { entry: ReportDocScreenshot }) {
  const src = isLocalFsPath(entry.path) ? undefined : safeImageUrl(entry.path);

  if (!src) {
    return (
      <figure className="my-3 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
        <div className="font-medium">Screenshot unavailable</div>
        <div className="mt-1 break-all font-mono text-xs">{entry.path}</div>
        {entry.alt ? <figcaption className="mt-1.5 text-xs">{entry.alt}</figcaption> : null}
      </figure>
    );
  }

  return (
    <figure className="my-3">
      <img
        src={src}
        alt={entry.alt ?? ""}
        loading="lazy"
        className="max-w-full rounded-md border border-border"
      />
      {entry.alt ? <figcaption className="mt-1.5 text-xs text-muted-foreground">{entry.alt}</figcaption> : null}
    </figure>
  );
}
