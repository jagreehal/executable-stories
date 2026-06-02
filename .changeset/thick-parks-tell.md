---
'executable-stories-playwright': patch
'executable-stories-vitest': patch
---

attachSpans() now accepts optional `{ traceId, spanId }` for the capture-then-attach trace path. When a test wraps work in its own root span after init(), the trace badge and "View Trace" link can be wired via attachSpans. Also extracts applyTraceToMeta into a shared idempotent helper — once a traceId is recorded it is not overwritten, so the active-span path in init() and the explicit path in attachSpans() compose without duplicating entries.
