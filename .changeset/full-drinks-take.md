---
'executable-stories-vitest': patch
---

Improve Vitest reporter resilience and compatibility for vitest-compatible runners (including `vite-plus`):

- fix coverage handling to accumulate data across multiple `onCoverage` callbacks instead of overwriting prior payloads
- isolate `rawRunPath` write failures so report generation, history updates, and notifications still run
- improve retry metadata mapping so `retries` is derived from available Vitest task metadata instead of always `0`
- add regression tests for coverage accumulation, raw run write failure resilience, and retry metadata mapping

Also adds a minimal `apps/vite-plus-example` workspace app to validate `vite-plus` config + StoryReporter usage, plus a root README update to better represent the project's multi-language package support.
