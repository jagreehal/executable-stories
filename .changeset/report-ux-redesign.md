---
"executable-stories-react": minor
"executable-stories-formatters": minor
"executable-stories-astro": minor
---

Redesign the HTML report UI on shadcn/Base UI components.

- Typography and tokens: switch the report to Geist + Geist Mono and a larger corner radius, applied across the standalone report, the React island, and the shared `--es-*` theme contract.
- Summary: flat neutral KPI cards with a monospace label, a status dot, and an oversized tabular number coloured by status, replacing the tinted pastel cards.
- Header: the theme control moves to the top-right beside search; "Expand all" and "Show documentation" become Base UI switches; status and tag filters sit above the view controls, separated by a divider.
- Status hierarchy: passed, skipped, and pending badges are quiet outlines, and the passing pill is dropped entirely (the check glyph and title carry it, with an sr-only status for screen readers). Only a failure keeps a filled badge, so a broken run stands out.
- Tags: the filter list collapses to one row behind a "+N more" toggle on tag-heavy reports, and selecting a tag no longer reflows its neighbours.
- New Base UI `Switch` primitive; the keyboard-shortcuts dialog is rebuilt on an aligned grid with a corrected `aria-keyshortcuts`.
- Astro embed: feature and scenario navigation folds into the Starlight sidebar and the report renders full-width.
- Astro packaging: `executable-stories-react` moves from a required peer dependency to a direct dependency, so consumers no longer install it separately, and the package version realigns to the 7.x line to track the supported Astro major.
