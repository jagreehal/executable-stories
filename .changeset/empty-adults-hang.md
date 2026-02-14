---
'executable-stories-formatters': minor
'executable-stories-playwright': minor
'executable-stories-vitest': minor
---

Add trace view to HTML reports: scenarios can display an OpenTelemetry-style trace waterfall when span data is attached. Formatters gain a trace-view renderer and OTEL types; Playwright and Vitest reporters pass trace/span data into the report.
