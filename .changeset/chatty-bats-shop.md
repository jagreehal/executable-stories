---
'executable-stories-formatters': patch
'executable-stories-playwright': patch
---

Fix 404s on screenshots when HTML reports are downloaded as CI artifacts.

`story.screenshot({ path })` previously emitted the absolute on-runner path
(e.g. `/home/runner/work/repo/test-results/foo.png`) directly as `<img src>`
in the generated HTML. When the artifact was downloaded and opened locally,
those paths no longer existed.

The HTML formatter now inlines local screenshot files as `data:` URIs at
render time when `embedScreenshots` is true (the default), making reports
self-contained. Remote `http(s)`/`data:` URLs and missing files pass through
unchanged. Disable per-report with `html: { embedScreenshots: false }`.
