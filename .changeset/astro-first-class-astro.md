---
"executable-stories-astro": minor
---

Initial release: a first-class Astro integration + Content Layer loader for
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
