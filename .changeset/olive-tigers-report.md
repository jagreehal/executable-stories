---
"executable-stories-core": minor
"executable-stories-formatters": minor
"executable-stories-react": minor
---

Reports and worklists now answer the questions people arrive with.

Search matches ticket ids, error text and source paths alongside titles, tags and steps. A red run offers every failure as one agent prompt from the failure banner. Returning readers get a "since your last visit" line covering what changed while they were away, kept in their own browser. Run details names the five slowest scenarios, and `check --max-duration` turns that into a CI budget. `triage --by-owner` groups the worklist by `CODEOWNERS`, routing each failure to the team that owns the code it covers.
