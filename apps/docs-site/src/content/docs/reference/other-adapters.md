---
title: Other adapters
description: Additional adapters and example apps in this repo beyond the JavaScript guides on this site
---

This docs site focuses on the JavaScript packages with the most end-user setup surface:

- `executable-stories-vitest`
- `executable-stories-jest`
- `executable-stories-playwright`
- `executable-stories-cypress`

The repo also includes non-JS adapters and example apps. They follow the same model: tests remain the source of truth, stories stay inside framework-native code, and everything feeds the shared formatter pipeline.

## Adapters in this repo

| Adapter | Package / app | Notes |
| ------- | ------------- | ----- |
| Go | `packages/executable-stories-go`, `apps/go-example` | Go story API and example tests. |
| pytest | `packages/executable-stories-pytest`, `apps/pytest-example` | Python adapter and example suite. |
| JUnit 5 | `packages/executable-stories-junit5`, `apps/junit5-example` | Kotlin/Java example with JUnit Platform integration. |
| Rust | `packages/executable-stories-rust`, `apps/rust-example` | Rust adapter and generated JSON writer. |
| xUnit | `packages/executable-stories-xunit`, `apps/xunit-example` | .NET 8 / C# adapter and example suite. |

## Shared capabilities

- OTel trace links are supported across the non-JS adapters via adapter-specific APIs or `OTEL_TRACE_URL_TEMPLATE`.
- Step timing is also available across the non-JS adapters; the JavaScript adapters record timing through step callbacks and helper wrappers.
- All adapters feed the same formatter stack, so HTML, Markdown, JUnit, Cucumber JSON, Cucumber Messages, notifications, CI metadata, and run history behave consistently once a `RawRun` reaches `executable-stories-formatters`.

## Where to look next

- Root repo feature matrix: [README.md](https://github.com/jagreehal/executable-stories/blob/main/README.md)
- Formatter pipeline and CLI: [/reference/formatters-api/](/reference/formatters-api/)
- Example apps in GitHub:
  - [apps/go-example](https://github.com/jagreehal/executable-stories/tree/main/apps/go-example)
  - [apps/pytest-example](https://github.com/jagreehal/executable-stories/tree/main/apps/pytest-example)
  - [apps/junit5-example](https://github.com/jagreehal/executable-stories/tree/main/apps/junit5-example)
  - [apps/rust-example](https://github.com/jagreehal/executable-stories/tree/main/apps/rust-example)
  - [apps/xunit-example](https://github.com/jagreehal/executable-stories/tree/main/apps/xunit-example)
