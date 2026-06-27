/**
 * HTML-escape a value for safe interpolation into the views' `set:html` strings
 * (titles, tags, source paths in the index/explorer chrome). Scenario *content*
 * is rendered by the React components, not string-built here — this stays only
 * for the thin site chrome the views assemble by hand.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
