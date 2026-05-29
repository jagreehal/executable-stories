---
"executable-stories-formatters": minor
---

Add Evidence-Driven Review — a report for reviewing AI-authored changes by behaviour and proof instead of by diff.

- New `review` CLI subcommand: correlates a run against the PR diff (`--changed-files`, `--base-ref`) and bands changed code as 🔴 uncovered / 🟡 weak / 🟢 covered, with opt-in gates (`--fail-on`, `--min-evidence`).
- `ReviewMarkdownFormatter` and `ReviewHtmlFormatter`: audience-segmented (stakeholder vs engineer, derived from file convention), evidence-graded claim cards with intent, tickets, and inline screenshots/OTEL.
- New typed `evidence` field on `TestCaseResult` (mutation score, changed-line coverage, failing-first), ingested at the ACL layer — no adapter or story-API changes.
- Fix: align `raw-run.schema.json` with what the official reporters emit (inline-body attachments, rich CI info) — previously a stale "MVP" shape that review-mode validation surfaced.
