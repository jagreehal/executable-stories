# demo-example

Astro starter that combines editorial content with generated executable demo pages.

## Quickstart

```bash
pnpm install
pnpm demo:build
pnpm dev
```

This generates story pages from `fixtures/raw-run.json` into `src/content/docs/stories/`.

## Why this app exists

- Shows how to keep CMS/editorial content and generated demo stories in one Astro site.
- Provides copy/paste scripts for CI-safe regeneration (`--strict`).

## Scripts

- `pnpm demo:build` — Generate stories and demo manifest from fixture run data.
- `pnpm dev` — Regenerate + run Astro dev server.
- `pnpm build` — Regenerate + build Astro site.
- `pnpm preview` — Regenerate + preview Astro site.

## Optional Playwright sample

The `playwright-sample/` folder contains example reporter wiring that writes `raw-run.json` artifacts.
Use it as a reference for your real E2E project.
