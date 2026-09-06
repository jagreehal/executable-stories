---
title: Cross-language parity
description: Required parity between JS/TS and Go, Ruby, Rust, Python, JVM, and .NET adapters
---

Go, Ruby, Rust, Python, JVM, and .NET adapters must reach parity with the JavaScript/TypeScript adapters for core story semantics, the doc model, artifact outputs, and agent-consumable workflows.

## Parity dimensions

| Dimension | Required outcome | JS/TS baseline | Non-JS status |
| --- | --- | --- | --- |
| **Behavior semantics** | Given/When/Then/And/But keywords, auto-And for repeated keywords, explicit `but()` | Vitest/Jest/Playwright/Cypress adapters | Implemented; verified via RawRun fixtures and `pnpm run verify:*` |
| **Doc model** | Same doc entry kinds and schema meaning (`json`, `state`, `table`, `code`, `section`, `link`, `mermaid`, `screenshot`, `html`, `custom`, `note`, `tag`, …) | Full surface in JS adapters | Implemented where host allows; gaps must be documented |
| **Feature declaration** | A file can declare what its scenarios are for: title, kind (`feature` / `ability` / `business-need`), narrative, glossary | `story.feature({ ... })` at module scope | Implemented in all six; the JVM and .NET key on the declaring class, since neither reports a source path |
| **Planned scenarios** | A scenario that is specified but not built yet reaches the report as status `todo` | `it.todo` (Vitest, Jest), `test.fixme` (Playwright), bodyless `it` (Cypress) | Explicit call: `Planned` / `planned`, since `skip` / `@Disabled` / `#[ignore]` mean "do not run this now" |
| **Artifact outputs** | RawRun JSON → StoryReport v1 via formatters CLI | Reporter `rawRunPath` + formatters | RawRun default `.executable-stories/raw-run.json`; format with `executable-stories format` |
| **`$schema` pointer** | Optional `$schema` in RawRun so editors validate the file as it is written | Not emitted by the JS/TS reporters | Emitted by **all six** non-JS adapters (Go, Ruby, Rust, pytest, JUnit 5, xUnit) |
| **Executed-file inventory** | A run reports `coveredSourceFiles`, every file it executed, so deleting a file's last scenario retires it instead of leaving it in the docs for good | Vitest, Jest, Playwright | Emitted by pytest, JUnit 5 and xUnit — pytest keys it on the test file, the JVM and .NET adapters on the test class each saw execute. **Not yet emitted** by Go, Ruby or Rust, where a file emptied of scenarios keeps them until the file itself is deleted |
| **Incomplete collection** | A run reports `incompleteSourceFiles` so a file whose collection broke is never treated as authoritative | Vitest, Jest, Playwright | Emitted by pytest and JUnit 5 — pytest from a skipped test, a broken fixture or teardown, a module that failed to import, or a failure before `story.init`; JUnit 5 from any container that did not succeed and from anything skipped. **Not yet emitted** by Go, Ruby, Rust or xUnit, where a broken run is treated by its `runScope`, so prefer leaving scope unset where collection failures are possible |
| **Run scope** | A run reports `runScope` — `"full"`, `"filtered"`, or absent — so consumers know whether it may retire a scenario it no longer reports. Only `"full"` retires; absent keeps and warns | Vitest/Jest (`testNamePattern`), Playwright (`grep`/`grepInvert`); Cypress declares it | Go (`-run`), Ruby (Minitest plugin options), pytest (`-k`, `-m`, `--deselect`, `--last-failed`, a node id, or a run that ended early), Rust (test binary args) detect it; JUnit 5 and xUnit declare it via `EXECUTABLE_STORIES_FILTERED` |
| **Assertions per step** | Claim steps carry an assertion count when the host can observe one; absent means unknown and zero means observed none | Vitest, Jest, and Playwright observe the framework counter; Cypress declares one through `story.expect` | Ruby/Minitest observes its assertion counter; Go `s.Expect`, Rust `expect_step`, pytest `story.expect`, JUnit 5 `Story.expect`, and xUnit `Story.Expect` declare one |
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
| Incomplete collection | Emitted by Vitest, Jest and Playwright | Emitted by pytest and JUnit 5; not by Go, Ruby, Rust or xUnit | Both hosts report more than passing leaf tests. pytest reports every phase, so a broken fixture, a failed import and a skipped test are all visible as "this file did not get to say what it contains". The JUnit Platform reports containers as well as tests, which matters most where it is generous: an enclosing class comes back successful even when a `@TestFactory` in it failed, so without the incomplete list a broken factory is indistinguishable from a class whose scenarios were deleted |
| Executed-file inventory | Emitted by Vitest, Jest and Playwright | Emitted by pytest, JUnit 5 and xUnit; not by Go, Ruby or Rust | Each host enumerates executed files differently. pytest's report hook, the JUnit Platform listener and xUnit's recording attribute all already run for every test, so what they saw is the inventory. Where it is omitted the consequence is bounded and visible: a file whose last scenario was deleted keeps that scenario until the file is removed from the working tree |
| Detecting run scope | Detected from the runner in Vitest, Jest, Playwright | Detected in Go, Ruby, pytest, Rust; **declared** in JUnit 5 and xUnit | The JUnit Platform keeps discovery filters from execution listeners, and `dotnet test --filter` is applied by the host before the adapter runs. Cypress diverges the same way on the JS side: narrowing by title needs `@cypress/grep`, which the reporter cannot observe. Playwright reports `filtered` for a sharded run too, since a shard holds only some of each file's tests. An adapter that cannot tell reports no scope, which keeps data rather than retiring it. |
| Counting assertions | Vitest, Jest, and Playwright observe live framework counters | Ruby/Minitest also observes; Go, Rust, pytest, JUnit 5, and xUnit declare assertion-bearing claim wrappers | Hosts without an assertion counter cannot distinguish an ordinary marker followed by a native assertion from an unchecked marker. Their wrappers declare one assertion; omitted counts remain unknown rather than becoming zero. |

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

Every non-JS adapter tags its RawRun with a `$schema` pointer (`https://executable-stories.dev/schemas/raw-run.schema.json`) at write time, so an editor validates the file as the adapter produces it. The field is optional in the raw-run schema and the CLI ignores it — `executable-stories doctor` reports whether a run file carries one.

## Release gate

Before releasing adapter or formatter changes:

1. No regression against this matrix without an explicit **intentional divergence** note
2. Update [README feature matrix](https://github.com/jagreehal/executable-stories#packages) when adding doc kinds or scenario options
3. Extend verify scripts or acceptance fixtures when adding a new language or artifact field

## Agent parity

Agents consume the same artifacts regardless of source language:

```bash
executable-stories format .executable-stories/raw-run.json --format story-report-json --output-dir reports --output-name index
executable-stories list reports/by-file --list-format json > reports/scenario-index.json
```

Optional MCP: [MCP server guide](/guides/mcp-server/).
