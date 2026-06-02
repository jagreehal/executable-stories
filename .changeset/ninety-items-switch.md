---
"executable-stories-formatters": minor
"executable-stories-vitest": minor
"executable-stories-jest": minor
"executable-stories-playwright": minor
"executable-stories-cypress": minor
---

First-class video support and an expanded docs/agent toolchain.

- **Adapters (Vitest, Jest, Playwright, Cypress):** add `story.video({ path, caption?, poster? })` doc kind and the `covers` story option (product-code paths/globs a scenario exercises). Playwright also auto-attaches its recorded run video.
- **Formatters:** render the new `video` doc entry across HTML, Markdown, Confluence, and Astro outputs.
- **Formatters CLI:** new `build-docs`, `check-links`, `watch`, `scaffold-doc`, and `import-openapi` commands.
- **Formatters artifacts:** add the behavior-manifest JSON, scenario-index JSON, and coverage-index outputs alongside StoryReport v1.
- **Astro template:** new Explorer page plus `HealthDashboard`, `VerifiedBy`, `VerifiedStep`, `ApiOperations`, `Checklist`, and `PageTitle` components, with verification/report-health helpers and global token styles.
