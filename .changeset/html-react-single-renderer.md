---
"executable-stories-formatters": minor
---

The HTML report is now rendered solely by executable-stories-react — the same renderer as the Astro docs site — and the in-package HTML string renderer is removed.

- **`--format html`** now produces the standalone, interactive React report (search, status/tag filters, collapse, copy actions) — the single component tree shared with the docs site. The `--html-no-syntax-highlighting` / `--html-no-mermaid` flags are honoured; the report is self-contained (assets embedded), so `--asset-mode copy` is a no-op for it. Scenarios are ordered by source position.
- **Removed**: the legacy HTML string renderer (`HtmlFormatter` / `HtmlOptions`), the 6 named HTML themes and the theme registry (`resolveTheme`, `HtmlTheme`, `getAvailableThemes`, `getCssOnlyThemes`), the `--html-theme` / `--html-theme-picker` CLI flags, the `executable-stories-formatters/render-doc` subpath export, and the interim `html-react` format name (use `html`). To render the report programmatically, use `renderReportToHtml` from `executable-stories-react/ssr`.
- The Evidence Review HTML (`review-html`) and run-diff HTML (`run-diff-html`) reports are unchanged in output; they now carry their own design tokens (light/dark) instead of depending on the removed theme system, and no longer accept a `theme` option (their dark-mode toggle still works). The canonical `--es-*` theme tokens (`ES_THEME_TOKENS_CSS`) remain exported.
