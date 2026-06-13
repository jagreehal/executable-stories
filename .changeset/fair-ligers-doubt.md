---
'executable-stories-formatters': minor
---

Extend the Astro living-docs portal with stakeholder-safe commentary and clearer ownership of generated content.

- add `executable-stories new scenario-note --scenario-id <id>` to scaffold per-scenario business context pages under `src/content/docs/notes/`
- emit `public/stories/notes-index.json` from `build-docs` and surface matching Business context links in the Scenario Explorer and `/stories/` overview
- render explicit unverified and stale states for hand-written pages via `verifiedBy`, `scenarioId`, and verification age warnings
- ship the `init-astro` scaffold with a portal-oriented `.gitignore` that keeps generated `stories/` and `public/stories/*` output out of git by default while preserving human-authored docs
