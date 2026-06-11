---
'executable-stories-formatters': minor
---

Add agent-loop reporting primitives to `executable-stories-formatters`.

This release adds the `check`, `goal`, and `triage` CLI commands for
backpressure, definition-of-done, and failure worklist flows, plus a new
`traceability-matrix` output format for requirement-first coverage reporting.
It also fixes raw-run schema validation gaps so runs that include story
`covers` metadata and step `stepId` fields validate correctly.
