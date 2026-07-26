/**
 * URL trust boundary shared by every surface that puts report-sourced strings
 * into the DOM (React report components, Astro state-catalog thumbnails).
 * Report JSON carries adapter-supplied paths/URLs, so they are untrusted.
 */

/**
 * A URL is safe to put in the DOM (href/src/poster) only if it's relative (no
 * scheme) or uses http/https. Anything with another scheme — notably
 * `javascript:` (which runs in the page context), plus `data:` / `vbscript:` /
 * `file:` — is rejected.
 */
export function safeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  if (scheme && !/^https?$/i.test(scheme[1] ?? "")) return undefined;
  return trimmed;
}

/**
 * Same trust boundary as safeUrl(), but for `<img src>`: also allows
 * `data:image/*` URIs, since that's how executable-stories-playwright's
 * story.screenshot() inlines a captured screenshot. Browsers sandbox SVG
 * rendered via `<img>` — no script execution, no external resource loads — so
 * `data:image/svg+xml` is safe here even though data: URIs are rejected for
 * iframe/video src.
 */
export function safeImageUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^data:image\//i.test(trimmed)) return trimmed;
  return safeUrl(trimmed);
}

/**
 * True for POSIX absolute paths (`/foo`, `\foo`) and Windows drive-letter
 * paths (`C:\foo`) — i.e. a local filesystem path rather than a URL. Report
 * assets are bundled (copied + rewritten to a relative `assets/...` path) at
 * format time when the source file can be found; a path that's still absolute
 * by the time it reaches the DOM means that bundling step couldn't find the
 * file — rendering it would 404 since it points at a path on the machine that
 * generated the report, not at the browser's origin.
 */
export function isLocalFsPath(value: string): boolean {
  return /^(?:[/\\]|[A-Za-z]:[/\\])/.test(value);
}
