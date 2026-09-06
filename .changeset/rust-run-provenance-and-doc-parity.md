---
"executable-stories-formatters": patch
---

Rust: a run that says when it ran and what produced it

Runs carry `startedAtMs` and `finishedAtMs`, which is what stamps a scenario's
freshness in the report, alongside `gitSha` — from CI first, `git rev-parse`
otherwise, bounded by its timeout — and `packageVersion`, so a report states the
commit it describes and what produced it. `runScope` reads `--ignored` as a
narrowed run, since it runs only the tests an ordinary run leaves out.

A relative `EXECUTABLE_STORIES_OUTPUT` resolves against the project root. Each
run goes to a scratch file of its own and is renamed over the destination, so a
watch task reading it mid-run sees a whole document and concurrent writers stay
out of each other's way. `StepDoc::video(path, caption, poster)` completes the
doc-entry surface against the raw-run schema.

The Rust reference and the `rust-story-api` skill cover feature declarations,
planned scenarios, video, embedded HTML, the provenance fields, and the
signatures for `with_ticket_url`, `attach_inline`, `attach_spans`,
`start_timer`/`end_timer`, `fn_step`, `expect_step` and `assert_that`, against
Rust 1.85 and edition 2024. `verify:rust` asserts each file's declaration and
the run's provenance, and rustfmt, clippy and a build on the declared minimum
toolchain run in CI.

Two new skills: `show-me` answers a question with the smallest view that makes
the point, reaching for the run before drawing anything; `demo-video` builds a
narrated walkthrough from a run's storyboard frames.
