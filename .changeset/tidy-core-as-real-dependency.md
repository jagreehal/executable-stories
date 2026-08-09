---
"executable-stories-core": minor
"executable-stories-formatters": patch
"executable-stories-react": patch
"executable-stories-astro": patch
"executable-stories-mcp": patch
"executable-stories-cypress": patch
"executable-stories-vitest": patch
"executable-stories-jest": patch
"executable-stories-playwright": patch
---

Consume `executable-stories-core` as a published dependency instead of bundling it.

`executable-stories-core` is now published to npm, so the packages that share its
types and converters declare it as a real dependency rather than inlining it at
build time. This removes the `noExternal` / `dts.resolve` workarounds from five
tsup configs and the `paths` aliases from two tsconfigs, and it stops five
published dists from each shipping their own copy of the ACL and converter code
(a copy that could silently diverge when packages released at different times
were installed together).

The framework adapters (Vitest, Jest, Playwright, Cypress) now take their shared
story types, `STORY_META_KEY`, and the OTel/doc-builder helpers from
`executable-stories-core` instead of routing them through
`executable-stories-formatters`. The Jest, Playwright, and Cypress story APIs no
longer load the formatters package at test time at all; Cypress in particular no
longer needs its special-case import to keep `node:fs` out of the browser bundle.

`tryGetActiveOtelContext`, `resolveTraceUrl`, and `OtelTraceContext` moved from
`executable-stories-formatters` into `executable-stories-core/utils/otel-detect`.
They are still re-exported from `executable-stories-formatters`, so no public API
changes.
