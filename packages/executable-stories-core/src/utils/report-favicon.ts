/**
 * The tab icon every generated HTML document carries.
 *
 * A report is a file someone keeps open beside the app it describes, often
 * several at once — this run, last week's, the diff between them. Without an
 * icon each one is the browser's blank page glyph, and picking the right tab
 * means reading truncated titles.
 *
 * Inline, as a data URI, because a report is a single self-contained file: it
 * gets emailed, attached to a CI job and opened from disk, so it can make no
 * external request. That rules out linking a `.ico` or `.svg` beside it.
 *
 * The mark is the one the docs site already uses
 * (`apps/docs-site/public/favicon.svg`) — a list of scenarios, in the project's
 * green. Drawn rather than an emoji: an emoji favicon renders through whatever
 * emoji font the viewer's OS has, which means a different picture on every
 * platform and an empty box on a bare Linux CI container.
 *
 * Lives in core rather than in the React package so the lighter HTML
 * renderers can use it. `colocated-index.ts` writes a plain string document on
 * purpose, and importing a value from `executable-stories-react/ssr` would pull
 * the whole React SSR path into its module graph.
 */

/**
 * Source form, kept readable. Written with single quotes so the encoded result
 * needs no escaping when it is dropped into a double-quoted HTML attribute:
 * `encodeURIComponent` leaves `'` alone and encodes the `#` of every colour,
 * which a data URI would otherwise read as the start of a fragment.
 */
const FAVICON_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
  "<rect x='3' y='2' width='26' height='28' rx='3' fill='#18181b' stroke='#40916c' stroke-width='1.5'/>" +
  "<circle cx='9' cy='10' r='2' fill='#40916c'/>" +
  "<line x1='14' y1='10' x2='25' y2='10' stroke='#a1a1aa' stroke-width='1.5' stroke-linecap='round'/>" +
  "<circle cx='9' cy='17' r='2' fill='#40916c'/>" +
  "<line x1='14' y1='17' x2='22' y2='17' stroke='#a1a1aa' stroke-width='1.5' stroke-linecap='round'/>" +
  "<circle cx='9' cy='24' r='2' fill='#40916c'/>" +
  "<line x1='14' y1='24' x2='20' y2='24' stroke='#a1a1aa' stroke-width='1.5' stroke-linecap='round'/>" +
  "</svg>";

/** Ready to drop into a `<head>`. */
export const REPORT_FAVICON_LINK = `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(
  FAVICON_SVG,
)}">`;
