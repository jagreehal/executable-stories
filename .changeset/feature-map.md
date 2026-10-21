---
'executable-stories-formatters': minor
---

Feature maps for agent verification skills.

- `executable-stories list <run> --list-format feature-map` prints one section per story file with Sub-features, How to get to it, Driving it and Gotchas. Agent `verify-<app>` skills, such as pstack's, read this shape, and you regenerate it after each run.
- New `stories-verify-skill` skill: wraps your story suite as a `verify-<app>` skill, compares a baseline run with a treatment run, and maps the result to `VERIFIED`, `NOT VERIFIED` or `INCONCLUSIVE` and their ledger verdicts.
- `bug-to-scenario` reproduces on the surface where the bug was reported and switches to verify mode when a fix already exists. `story-pr` uses a workflow's own PR headings when it sets them.
