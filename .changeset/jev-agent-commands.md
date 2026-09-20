---
"executable-stories-formatters": minor
---

`triage`, `goal`, and `review` accept optional Jev (TypeSafe AI) judgments. With `JEV_API_KEY` set, `triage` suggests a `covers` path and a failure kind (product/test/infra) for unrouted failures, `goal` reports rewritten scenarios that check less as ratchet advisories, and `review` infers `changeType` for untagged claims, marked with its confidence. Exit codes stay rule-driven. The `init-astro`, `dev`, `new`, and `import-openapi` subcommands are retired.
