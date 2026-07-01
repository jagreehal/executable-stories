---
"executable-stories-playwright": minor
"executable-stories-formatters": patch
"executable-stories-react": patch
---

Fix broken screenshots surfacing as raw `/home/runner/work/...` image links in
PR comments and a bare, un-labeled broken `<img>` in HTML reports — plus a new
`story.screenshot({ page, alt })` form that removes the root cause.

- **executable-stories-playwright**: `story.screenshot({ path })` now warns
  (`console.warn`) at the call site when the file can't be read, instead of
  silently falling back to the raw path and only surfacing the problem minutes
  later as a broken image in CI. The far more common cause is a missing
  `page.screenshot({ path })` call, or a `path` that doesn't match — the
  warning names the exact path and suggests the fix.
  Add `story.screenshot({ page, alt })`: captures the screenshot itself from
  the in-memory buffer and inlines it as a `data:` URI directly, with no
  filesystem round-trip at all — so there's no path for the two calls to fall
  out of sync, and nothing for Playwright's per-test output cleanup to delete
  before the report is built. `path` is still accepted alongside `page` if you
  also want the file written to disk. The existing `{ path }`-only form still
  works unchanged for screenshots captured elsewhere.
  Inline step docs (`story.then(text, { screenshot: { path } })`) now inline
  existing files as `data:` URIs too, matching `story.screenshot()` — this
  path previously never embedded the file no matter how it was captured.
- **executable-stories-formatters**: the Markdown formatter no longer emits
  `![alt](path)` for a screenshot whose path isn't a `data:`/`http(s):` URI.
  A bare filesystem path only ever appears when capture-time inlining failed,
  and embedding it verbatim guarantees a broken image everywhere that
  Markdown is rendered (GitHub PR comments, docs sites, ...). It now renders
  a plain "Screenshot unavailable" note naming the path instead.
- **executable-stories-react**: restore the "Screenshot unavailable"
  placeholder for local-filesystem screenshot/video paths that the HTML
  report's asset bundler couldn't resolve — a regression from the React
  rendering rewrite where `DocScreenshot` rendered a bare `<img src>` with no
  fallback. Also route the `src` through the same scheme allow-list already
  used for `DocVideo`/`DocHtml` (`data:image/*`, `http(s):`, or relative only)
  instead of passing the report-supplied path straight into the DOM.
