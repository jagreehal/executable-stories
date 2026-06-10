---
title: Cross-language parity
description: Required parity between JS/TS and Go, Ruby, Rust, Python, JVM, and .NET adapters
---

Go, Ruby, Rust, Python, JVM, and .NET adapters must reach parity with the JavaScript/TypeScript adapters for core story semantics, the doc model, artifact outputs, and agent-consumable workflows.

## Parity dimensions

| Dimension | Required outcome | JS/TS baseline | Non-JS status |
| --- | --- | --- | --- |
| **Behavior semantics** | Given/When/Then/And/But keywords, auto-And for repeated keywords, explicit `but()` | Vitest/Jest/Playwright/Cypress adapters | Implemented; verified via RawRun fixtures and `pnpm run verify:*` |
| **Doc model** | Same doc entry kinds and schema meaning (`json`, `table`, `code`, `section`, `link`, `mermaid`, `screenshot`, `html`, `custom`, `note`, `tag`, …) | Full surface in JS adapters | Implemented where host allows; gaps must be documented |
| **Artifact outputs** | RawRun JSON → StoryReport v1 via formatters CLI | Reporter `rawRunPath` + formatters | RawRun default `.executable-stories/raw-run.json`; format with `executable-stories format` |
| **Agent workflow** | StoryReport JSON + `list --list-format json` index | [Agent artifact contract](/guides/agent-artifact-contract/) | Same formatter pipeline for all languages |
| **Verification** | Per-language verify script + formatter acceptance tests | Example apps + `pnpm quality` | `verify:go`, `verify:pytest`, `verify:rust`, `verify:junit5`, `verify:xunit`, `verify:ruby` |

Status values used in release review:

- **required** — must match JS/TS unless impossible on the host framework
- **intentional divergence** — documented host limitation (must appear in README feature matrix)
- **in progress** — tracked gap with owner and target release

## Intentional divergences (today)

| Area | JS/TS | Non-JS | Rationale |
| --- | --- | --- | --- |
| Init API | `story.init(task)` (Vitest), `story.init()` (Jest), fixture-aware Playwright | Language-native init (`es.Init(t, …)`, `ExecutableStories.init`, …) | Framework-native first — no shared interpreter |
| Reporter integration | In-process Node reporters | Write RawRun at end of test run | Host runtime differs |
| ESLint plugins | Per-framework plugins | None (Ruby/Go use native linters) | Host tooling |
| Cypress `doc.story` override | Cypress-only title override | N/A | Cypress-specific legacy path |

## Verification commands

From repo root (requires language toolchain):

```bash
pnpm run verify:go
pnpm run verify:pytest
pnpm run verify:rust
pnpm run verify:junit5
pnpm run verify:xunit
pnpm run verify:ruby
./scripts/verify-all.sh
```

Each script:

1. Runs the adapter example or package tests
2. Asserts RawRun structure
3. Validates schema via `executable-stories validate`
4. Runs formatter pipeline (HTML + Markdown + StoryReport JSON + list index)

Formatter package tests also load cross-language RawRun fixtures (`schemas/examples/go.json`, `rust.json`, `pytest.json`, `junit5.json`, `dotnet.json`) and assert StoryReport v1 validation.

## Release gate

Before releasing adapter or formatter changes:

1. No regression against this matrix without an explicit **intentional divergence** note
2. Update [README feature matrix](https://github.com/jagreehal/executable-stories#packages) when adding doc kinds or scenario options
3. Extend verify scripts or acceptance fixtures when adding a new language or artifact field

## Agent parity

Agents consume the same artifacts regardless of source language:

```bash
executable-stories format .executable-stories/raw-run.json --format story-report-json --output-dir reports --output-name index
executable-stories list .executable-stories/raw-run.json --list-format json > reports/scenarios-index.json
```

Optional MCP: [MCP server guide](/guides/mcp-server/).
