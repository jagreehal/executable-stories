# executable-stories-react

## 0.2.1

### Patch Changes

- b905ea9: Fix broken screenshots surfacing as raw `/home/runner/work/...` image links in
  PR comments and a bare, un-labeled broken `<img>` in HTML reports — plus a new
  `story.screenshot({ page, alt })` form that removes the root cause.
  - **executable-stories-playwright**: `story.screenshot({ path })` now warns
    (`console.warn`) at the call site when the file can't be read, instead of
    silently falling back to the raw path and only surfacing the problem minutes
    later as a broken image in CI. The far more common cause is a missing
    `page.screenshot({ path })` call, or a `path` that doesn't match — the
    warning names the exact path and suggests the fix.
    Add `story.screenshot({ page, alt })`: captures the screenshot itself from
    the in-memory buffer and inlines it as a `data:` URI directly, with no
    filesystem round-trip at all — so there's no path for the two calls to fall
    out of sync, and nothing for Playwright's per-test output cleanup to delete
    before the report is built. `path` is still accepted alongside `page` if you
    also want the file written to disk. The existing `{ path }`-only form still
    works unchanged for screenshots captured elsewhere.
    Inline step docs (`story.then(text, { screenshot: { path } })`) now inline
    existing files as `data:` URIs too, matching `story.screenshot()` — this
    path previously never embedded the file no matter how it was captured.
    `story.video()` also now warns when given an absolute path that doesn't
    exist yet — video bytes are never inlined (too large for a `data:` URI),
    so it had no equivalent signal at all before; a relative path (resolved
    later by the asset bundler) is unaffected.
  - **executable-stories-formatters**: the Markdown formatter no longer emits
    `![alt](path)` / `<source src="path">` for a screenshot or video whose path
    is a bare local filesystem path rather than a `data:`/`http(s):` URI or a
    bundler-resolvable relative path. `story.video()` never inlines (video
    bytes are too large) and only ever resolves through a downstream asset
    bundler, so an absolute path reaching Markdown means that step didn't run —
    most commonly because the Markdown was posted straight to a GitHub PR
    comment, with no bundling step in between. Embedding it verbatim guarantees
    a broken reference everywhere that Markdown is rendered. Both now render a
    plain "Screenshot/Video unavailable" note naming the path instead.
  - **executable-stories-react**: restore the "Screenshot unavailable" /
    "Video unavailable" placeholder for local-filesystem screenshot/video paths
    that the HTML report's asset bundler couldn't resolve — a regression from
    the React rendering rewrite where `DocScreenshot` rendered a bare `<img
src>` and `DocVideo` a bare `<video src>` with no fallback for either. Also
    route `DocScreenshot`'s `src` through the same scheme allow-list already
    used by `DocVideo`/`DocHtml` (`data:image/*`, `http(s):`, or relative only)
    instead of passing the report-supplied path straight into the DOM.

## 0.2.0

### Minor Changes

- d7c4661: Rebuild the React report components on shadcn/ui + Tailwind v4 and render them as islands in the Astro docs site, so the docs site and the formatters' HTML report draw from one component implementation.
  - **executable-stories-react**: the report surfaces (`ReportSummary`, `ReportFeature`, `ReportScenario`, `ReportSteps`, `ReportEmpty`) and the `Doc*` kinds are rebuilt on shadcn primitives (`Card`, `Badge`, `Alert`, `Empty`, `Command`) themed to the HTML report palette — IBM Plex, status tints, and the green keyword-column steps with And/But continuation. Status text colours are darkened to meet WCAG AA. New `ScenarioExplorer` component (a shadcn `Command`-based searchable/filterable scenario list), a `hideTitle` prop on `ReportScenario`, and a matching `hideHeader` prop on `ReportInteractive` (for pages that own the title heading). Accessibility fixes that apply to every surface (standalone HTML + Astro): scrollable code/table/diagram blocks are now keyboard-focusable (`tabindex`), and the interactive failure banner uses the AA-safe failed colour. Ships a precompiled `executable-stories-react/tailwind.css` (theme + utilities only, **no preflight**, with a scoped `.es-report-island` reset) so the components embed in host sites without a global reset leaking. Adds a Storybook (`@storybook/react-vite`) component-test tier (`@storybook/addon-vitest` play functions + `@storybook/addon-a11y`).

    Note: component markup moved from `.es-*` class names to shadcn `data-slot` attributes + Tailwind utility classes. Consumers that targeted the old class names for styling should migrate to the `--es-*` token overrides or the `data-slot` hooks.

  - **executable-stories-astro**: the docs site now renders the SAME React report components the standalone single-file HTML report uses, so the two surfaces look and behave identically. The scenario detail route renders `<ReportScenario hideTitle>` as a static island; the stories index renders the full report as one interactive `<ReportInteractive>` island (search, status/tag filters, collapse, copy actions) reconstructed from the `stories` collection. `executable-stories-react`, `@astrojs/react`, `react`, and `react-dom` are peer dependencies; consumers install them and add `react()` to their Astro config (the integration warns at startup if no React renderer is registered — Astro requires framework renderers to be registered by the project).

### Patch Changes

- Updated dependencies [d7c4661]
  - executable-stories-core@0.18.0

## 0.1.16

### Patch Changes

- Updated dependencies [99072d1]
  - executable-stories-formatters@0.17.0

## 0.1.15

### Patch Changes

- Updated dependencies [31cce46]
  - executable-stories-formatters@0.16.0

## 0.1.14

### Patch Changes

- Updated dependencies [e3f8c5b]
  - executable-stories-formatters@0.15.1

## 0.1.13

### Patch Changes

- Updated dependencies [424b22c]
  - executable-stories-formatters@0.15.0

## 0.1.12

### Patch Changes

- Updated dependencies [6374d1b]
  - executable-stories-formatters@0.14.0

## 0.1.11

### Patch Changes

- Updated dependencies [e75d26f]
  - executable-stories-formatters@0.13.0

## 0.1.10

### Patch Changes

- Updated dependencies [46c17b9]
  - executable-stories-formatters@0.12.0

## 0.1.9

### Patch Changes

- bed366d: chore: update dependencies

  Routine dependency refresh via npm-check-updates (3-day publish cooldown). Notable changes:
  - **executable-stories-init**: `commander` 14 → 15, `@clack/prompts` 1.3 → 1.5
  - **executable-stories-react**: `marked` 15 → 18, `zod` 4.0 → 4.4; `react`/`react-dom` peer raised to `>=19.2.7`
  - **executable-stories-mcp**: `zod` 4.0 → 4.4
  - **executable-stories-formatters**: `yaml` 2.8 → 2.9
  - Peer-minimum raises: `cypress >=15.16.0`, `jest >=30.4.2`, `@playwright/test >=1.60.0`, `autotel >=3.4.4`

  Also migrated the workspace build/test tooling to **vite 8** (`vite: ^8` pnpm override; `@vitejs/plugin-react` 4 → 6). vitest 4.1.8 and storybook-vite 10.4.2 already support vite 8, and the astro example/docs apps build cleanly on it. `@types/estree` is pinned to `1.0.9` via a pnpm override to dedupe with eslint 10.4.1 (a split `1.0.8`/`1.0.9` otherwise breaks the eslint-plugin type-checks).

  (Dev-tooling-only bumps — eslint, vitest, turbo, storybook, @types/node, vite — are not released as they don't affect consumers of the published packages.)

- Updated dependencies [bed366d]
  - executable-stories-formatters@0.11.4

## 0.1.6

### Patch Changes

- Updated dependencies [c6890c9]
  - executable-stories-formatters@0.11.1

## 0.1.5

### Patch Changes

- Updated dependencies [00854ee]
  - executable-stories-formatters@0.11.0

## 0.1.4

### Patch Changes

- Updated dependencies [f790128]
  - executable-stories-formatters@0.10.0

## 0.1.3

### Patch Changes

- Updated dependencies [203692c]
  - executable-stories-formatters@0.9.0

## 0.1.2

### Patch Changes

- Updated dependencies [7f1f13d]
  - executable-stories-formatters@0.8.0

## 0.1.1

### Patch Changes

- Updated dependencies [6c87c1f]
  - executable-stories-formatters@0.7.15
