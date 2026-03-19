---
'executable-stories-playwright': minor
'executable-stories-cypress': minor
'executable-stories-vitest': minor
'executable-stories-jest': minor
---

Add `story.attachSpans()` API to all framework adapters for attaching OTel spans to stories, enabling trace waterfall rendering in HTML reports. Fix Jest adapter span and attachment registries to key by scenario index instead of scenario name, preventing data overwrites when multiple stories share the same title.
