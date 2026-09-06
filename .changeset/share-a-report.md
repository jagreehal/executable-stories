---
"executable-stories-core": minor
"executable-stories-formatters": minor
"executable-stories-react": minor
---

Share a report, with its evidence, as a link.

`executable-stories share <reports-dir|report.html|report.json>` publishes a
report to Executable Stories Cloud and prints a link. The screenshots, videos
and embedded HTML it references go up with it through presigned uploads
straight to object storage, so the link shows what your local copy shows.
`--emails` limits it to named people behind a sign-in, and `--expires-days`
sets the lifetime (default 30, `0` never expires).

`--html-share` adds a Share button to the HTML report that hands the reader
that command. Core gains `collectReportAssets` and `rewriteReportAssets`: the
local files a report points at, and how to re-point them for a host serving the
report elsewhere.
