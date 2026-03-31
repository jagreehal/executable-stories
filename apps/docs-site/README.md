# Executable Stories — Documentation Site

Documentation site for [executable-stories](https://github.com/jagreehal/executable-stories), built with [Astro](https://astro.build) + [Starlight](https://starlight.astro.build).

## Quick start

```bash
# From the monorepo root
pnpm install

# Start the docs site (with base path, matches production)
pnpm --filter executable-stories-docs dev
# → http://localhost:4321/executable-stories/

# Or from the docs-site directory
cd apps/docs-site
pnpm dev
```

For development without the base path:

```bash
pnpm dev:root
# → http://localhost:4321/
```

## Build

```bash
pnpm --filter executable-stories-docs build
```

Output goes to `dist/`. For GitHub Pages, deploy the contents of `dist/` to a branch or `gh-pages` with the repo configured for the path `/executable-stories`.

## Project structure

```
src/content/docs/
├── index.mdx                    # Homepage (splash template)
├── getting-started/             # Installation + first story per framework
│   ├── installation-vitest.md
│   ├── installation-jest.md
│   ├── installation-playwright.md
│   ├── installation-cypress.md
│   ├── first-story-vitest.md
│   ├── first-story-jest.md
│   ├── first-story-playwright.md
│   └── first-story-cypress.md
├── guides/                      # How-to guides and concepts
│   ├── developer-experience.md
│   ├── output-modes.md
│   ├── understanding-the-report.md
│   ├── common-issues.md
│   ├── why-not-cucumber.md
│   ├── ci-and-source-links.md
│   ├── collating-reports.md
│   ├── formatting-and-metadata.md
│   ├── converting-vitest.md
│   ├── converting-jest.md
│   └── converting-playwright.md
├── reference/                   # API references
│   ├── core-api.md
│   ├── other-adapters.md
│   ├── formatters-api.md
│   ├── eslint-plugins.md
│   ├── vitest-config.md
│   ├── vitest-story-api.md
│   ├── jest-config.md
│   ├── jest-story-api.md
│   ├── playwright-config.md
│   ├── playwright-story-api.md
│   ├── cypress-config.md
│   └── cypress-story-api.md
└── recipes/                     # Example scenarios with code + output
    ├── vitest/
    │   ├── index.md             # Overview with full recipe table
    │   └── *.md                 # 32 individual recipe files
    ├── jest/
    │   └── index.md             # Overview with examples + table
    ├── playwright/
    │   └── index.md             # Overview with examples + table
    └── cypress/
        └── index.md             # Overview with examples + table
```

## Configuration

- **`astro.config.mjs`** — Site config, Starlight sidebar, integrations (sitemap, Mermaid, Tailwind)
- **`content.config.ts`** — Content collection schema (Starlight docs loader)
- **`src/styles/global.css`** — Custom CSS (Tailwind)

## Adding a new page

1. Create a `.md` or `.mdx` file in the appropriate `src/content/docs/` subdirectory.
2. Add frontmatter with `title` and `description`.
3. Add the page to the sidebar in `astro.config.mjs`.
4. Run `pnpm dev` to preview.

## Tech stack

- [Astro 5](https://astro.build) — Static site generator
- [Starlight](https://starlight.astro.build) — Documentation theme
- [starlight-theme-next](https://github.com/HiDeoo/starlight-theme-next) — Theme plugin
- [Tailwind CSS 4](https://tailwindcss.com) — Styling
- [astro-mermaid](https://github.com/joesaby/astro-mermaid) — Mermaid diagram rendering
- [Sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/) — SEO sitemap generation

## Deployment

The site is deployed to GitHub Pages at `https://jagreehal.github.io/executable-stories/`.

The `base` path is controlled by the `BASE` environment variable (default: `/executable-stories`). CI uses the default; local dev can override with `pnpm dev:root` (sets `BASE=/`).
