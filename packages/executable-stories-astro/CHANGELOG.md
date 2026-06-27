# executable-stories-astro

## 1.0.0

### Minor Changes

- d7c4661: Initial release: a first-class Astro integration + Content Layer loader for
  executable-stories living docs.
  - `executableStories()` integration injects routes for a stories index
    (`/stories`), per-scenario detail pages (`/stories/<slug>`), and a searchable
    Scenario Explorer (`/explorer`).
  - Renders those routes **inside the Starlight shell** (sidebar, global search,
    theme toggle) when the site uses Starlight, and as standalone pages otherwise
    — auto-detected, with a `shell: 'auto' | 'starlight' | 'standalone'` override.
    `@astrojs/starlight` is an optional peer dependency, so non-Starlight sites are
    unaffected. Scenario URLs are short, readable title slugs.
  - `storiesLoader()` turns the test run JSON into a hot-reloading `stories`
    collection; `trajectoryLoader()` exposes the session run-trajectory; an
    `authoredDocsLoader` auto-titles plain markdown.
  - Ships `render-doc-entry`, `verification`, `report-health`, and the
    `VerifiedBy` / `Trajectory` / `HealthDashboard` / `ApiOperations` components.
  - Themeable story pages via `theme: { preset, accent, tokens }` — built-in
    palettes (`terminal`/`minimal`/`vibrant`) plus per-token `--es-*` overrides,
    applied in both the standalone and Starlight-shell modes and scoped to the
    story content so the host's chrome is untouched.
  - `collection`, `routeBase`, and `explorerBase` are honoured everywhere
    (renaming the collection or root-mounting the routes both work).
  - First-run onboarding: before any test run, the pages show a getting-started
    panel naming the exact run-JSON path being watched and the `rawRunPath` wiring,
    and the dev/build terminal prints a matching preflight that pre-empts Astro's
    "collection is empty" notice.
  - Depends on `executable-stories-core` for the shared report/story types.

- d7c4661: Rebuild the React report components on shadcn/ui + Tailwind v4 and render them as islands in the Astro docs site, so the docs site and the formatters' HTML report draw from one component implementation.
  - **executable-stories-react**: the report surfaces (`ReportSummary`, `ReportFeature`, `ReportScenario`, `ReportSteps`, `ReportEmpty`) and the `Doc*` kinds are rebuilt on shadcn primitives (`Card`, `Badge`, `Alert`, `Empty`, `Command`) themed to the HTML report palette — IBM Plex, status tints, and the green keyword-column steps with And/But continuation. Status text colours are darkened to meet WCAG AA. New `ScenarioExplorer` component (a shadcn `Command`-based searchable/filterable scenario list), a `hideTitle` prop on `ReportScenario`, and a matching `hideHeader` prop on `ReportInteractive` (for pages that own the title heading). Accessibility fixes that apply to every surface (standalone HTML + Astro): scrollable code/table/diagram blocks are now keyboard-focusable (`tabindex`), and the interactive failure banner uses the AA-safe failed colour. Ships a precompiled `executable-stories-react/tailwind.css` (theme + utilities only, **no preflight**, with a scoped `.es-report-island` reset) so the components embed in host sites without a global reset leaking. Adds a Storybook (`@storybook/react-vite`) component-test tier (`@storybook/addon-vitest` play functions + `@storybook/addon-a11y`).

    Note: component markup moved from `.es-*` class names to shadcn `data-slot` attributes + Tailwind utility classes. Consumers that targeted the old class names for styling should migrate to the `--es-*` token overrides or the `data-slot` hooks.

  - **executable-stories-astro**: the docs site now renders the SAME React report components the standalone single-file HTML report uses, so the two surfaces look and behave identically. The scenario detail route renders `<ReportScenario hideTitle>` as a static island; the stories index renders the full report as one interactive `<ReportInteractive>` island (search, status/tag filters, collapse, copy actions) reconstructed from the `stories` collection. `executable-stories-react`, `@astrojs/react`, `react`, and `react-dom` are peer dependencies; consumers install them and add `react()` to their Astro config (the integration warns at startup if no React renderer is registered — Astro requires framework renderers to be registered by the project).

### Patch Changes

- Updated dependencies [d7c4661]
- Updated dependencies [d7c4661]
  - executable-stories-core@0.18.0
  - executable-stories-react@0.2.0
