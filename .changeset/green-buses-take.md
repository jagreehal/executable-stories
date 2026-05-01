---
'executable-stories-formatters': patch
'executable-stories-playwright': patch
---

Fix broken screenshots, videos, and garbled error output in HTML reports
generated on GitHub Actions and other CI runners.

**Screenshots (`story.screenshot()`).** The path passed to `story.screenshot()`
(typically `testInfo.outputPath(...)`) lives inside Playwright's per-test
`test-results/` directory, which Playwright cleans up between runs. By the
time the formatter (or a downstream artifact-only job) generated the HTML,
those files were gone and reports shipped `<img src="/home/runner/work/...">`
that 404'd against whatever host served the page. `story.screenshot()` now
reads the file synchronously at the call site and inlines it as a `data:` URI,
so the bytes are captured the moment they exist. Remote URLs and unreadable
paths fall back to the original behavior.

**Videos, traces, and auto-attachments.** Playwright videos and other
path-based attachments hit the same cleanup race. The Playwright reporter now
persists each path-based attachment at `onTestEnd`: files at or below
`attachments.inlineMaxBytes` (default 1 MB) are base64-encoded into
`raw-run.json`, larger files are copied to
`<outputDir>/attachments/<test-id>/<filename>` and the path is rewritten to
that stable location. Configurable via the new
`StoryReporterOptions.attachments` field; pass `{ enabled: false }` for the
previous behavior.

**Error rendering.** Playwright supplies failure messages with embedded ANSI
color codes (e.g. `\x1B[2mexpect(\x1B[22m...`). The reporter now strips ANSI
from `error.message` and `error.stack` before they reach raw-run, and the HTML
error-box renderer strips defensively as well so other adapters benefit.

**Defensive HTML rendering.** When the formatter still cannot read a local
absolute path at format time (POSIX `/foo` or Windows `C:\foo`), screenshots
and attachments now render a "Screenshot/Attachment unavailable" placeholder
showing the original path instead of emitting a broken `<img>`/`<video>` tag.
Relative paths, remote URLs, and reports with `embedScreenshots: false` keep
the legacy `<img>`/`<video>`/`<a>` output so users handling assets externally
are unaffected.
