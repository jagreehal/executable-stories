---
'executable-stories-formatters': minor
---

Extend the living-docs portal in `build-docs` with audience-aware navigation and baseline diff reporting.

- **`--audience-split`** — partition story pages into `stories/engineer/` and `stories/stakeholder/` (opt-in; default layout is unchanged)
- **`--baseline <story-report.json>`** — emit a what's-changed page (`stories/changes.md` + `public/stories/changes.json`) with added/removed/regressed/fixed/changed groups, and 🆕/✅/⚠️ badges on affected scenario pages
- **Scenario deep-link index** — `public/stories/scenario-links.json` keyed by stable scenario id (`url`, `anchor`, `deepLink`, `audience`, `status`) for external tools and MCP
- **Stories overview** — audience-first landing page at `/stories/` with pass/fail cards and deep links
- **Markdown hooks** — `scenarioAnchor` and `scenarioBadge` options for in-page anchors and change markers
