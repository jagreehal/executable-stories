---
"executable-stories-react": patch
"executable-stories-core": patch
---

HTML report navigation and polish.

- The contents sidebar scrolls on its own, keeps the current scenario in view, and pins its "Contents" label. A back-to-top button appears a screen down and returns focus to the report.
- Contents links, `f`/`F`, deep links and "View first failure" jump to the scenario with no scroll animation. Press `/` from anywhere to search; the search box shows the hint.
- Clicking anywhere on a scenario's title row opens or closes it. Controls give press feedback, show a focus ring, and offer 44px targets on touch screens.
- Long URLs, hashes and paths wrap inside their card. Long tags truncate with the full text on hover, and feature paths keep the file name in view.
- During a search the summary, status filters and failure banner count the whole run. Counts use thousands separators.
- Failures show the stack trace in a collapsed section. Printing includes the full trace and every table row.
- Dark mode uses one background for the page, cards and code blocks. Active filters and primary buttons meet WCAG AA contrast.
- Off-screen scenario cards skip layout, so a 2,000-scenario report scrolls without dropped frames.
- `formatDuration` shows days for durations of 24 hours or more ("53d 12h").
