---
'executable-stories-formatters': minor
'executable-stories-core': minor
'executable-stories-react': minor
'executable-stories-vitest': minor
'executable-stories-playwright': minor
'executable-stories-remotion': minor
---

Traces across processes, API coverage, and richer recordings.

- `format --otel-traces <file|url>` and `--otel-logs <file|url>` join spans and logs from other processes onto scenarios by trace id (OTLP JSON, collector NDJSON, or an OTLP HTTP readback). The CLI reports traces that started without a scenario's context; `--json-summary` counts them as `lostContextTraces`.
- `coverage api <run|reports-dir> --openapi <spec> --proto <file>` lists each OpenAPI operation and gRPC method with the scenarios whose server spans reached it.
- The trace waterfall shows span events and logs under the span that wrote them, and a Steps lane marks where each step began with its screenshot. Spans carry `kind`; the Vitest collector keeps timing and events.
- The Playwright reporter reads `otel-spans`, `otel-logs`, and `otel-trace-id` annotations from the test fixture.
- `executable-stories video` plays still stretches at 8x after 1.5s (`--idle-speed`) and records each page address in the manifest. `--frame` writes a framed copy with click rings, a browser title bar, and a padded background (`--frame-background`).
- executable-stories-remotion frames recordings with a browser title bar showing the address, draws a fingertip for taps, and fades the pointer while it waits.
