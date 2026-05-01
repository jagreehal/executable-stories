# executable-stories-demo

Publish Astro product demo sites from executable-stories Playwright run artifacts.

## Install

```bash
pnpm add -D executable-stories-demo executable-stories-formatters
```

## Commands

```bash
executable-stories-demo init my-demo-site
executable-stories-demo build --input reports/raw-run.json --site my-demo-site
executable-stories-demo preview --site my-demo-site

# CI-safe build (fail on missing assets)
executable-stories-demo build \
  --input reports/raw-run.json \
  --site my-demo-site \
  --strict

# Custom assets path/base URL
executable-stories-demo build \
  --input reports/raw-run.json \
  --site my-demo-site \
  --assets-dir public/media \
  --assets-base-url /media
```

## Input contract

- `build --input` accepts:
  - a raw run JSON (`status: pass|fail|skip`) which is canonicalized automatically, or
  - an already canonical run JSON (`status: passed|failed|skipped|pending`).
- `build --site` must point to a scaffolded demo site containing `astro.config.mjs` (created by `init`).

## Build flow

1. `init` scaffolds an Astro Starlight site and writes `demo.config.json`.
2. `build` reads the run JSON, generates story pages under `src/content/docs/stories`, appends scenario attachments (video/image/file) to each generated page, copies and hashes local media assets into `public/demo-assets`, writes `demo-manifest.json`, and updates `src/content/docs/index.mdx`.
3. `preview` runs the Astro site (`dev` by default, configurable via `--mode`).

## Config

`demo.config.json`:

```json
{
  "productName": "My Product",
  "tagline": "Automate everything",
  "theme": "default",
  "template": "splash",
  "cta": {
    "primary": "Get Started",
    "url": "/signup"
  },
  "stats": { "mode": "capability" },
  "featured": { "scenario": "stories/checkout/happy-path" },
  "branding": {
    "logo": "/brand/logo.svg",
    "ogImage": "/brand/og.png",
    "favicon": "/brand/favicon.svg",
    "accent": "#ff5722"
  },
  "seo": {
    "title": "My Product — verified scenarios",
    "description": "End-to-end product walkthrough.",
    "twitter": "@acme",
    "canonical": "https://example.com/demo/"
  },
  "sections": [
    {
      "kind": "feature-grid",
      "heading": "Why teams use it",
      "items": [
        { "title": "Real test runs", "body": "Pages reflect what actually shipped." },
        { "title": "One CLI", "body": "Pick a theme, ship a demo." }
      ]
    },
    { "kind": "quote", "quote": "Replaced our static deck.", "attribution": "Sales engineer, Acme" }
  ],
  "scenarios": {
    "order": ["stories/signup-flow", "stories/dashboard"]
  }
}
```

### Templates

- `template: "splash"` (default) — product-page chassis: hero with optional logo + CTA, optional featured scenario with inline media, capability-framed stats, custom sections, scenario list. Designed for customers, prospects, sales engineering.
- `template: "dashboard"` — engineering test-report layout: hero, test-mode stats (Passed / Failed / Skipped), story list. The original demo behaviour.

### Stats modes

- `stats.mode: "capability"` — buyer-friendly: total scenarios + verified count. Default for `splash`.
- `stats.mode: "test"` — engineering view: passed / failed / skipped. Default for `dashboard`.
- `stats.mode: "off"` — hide the strip entirely.

### Featured scenario

Set `featured.scenario` to a story slug (e.g. `stories/checkout/happy-path`). The first video or image attachment from that scenario is rendered inline beneath the hero, with a "Read the full scenario →" link to the dedicated page. Splash mode only.

### Sections

Splash mode supports an optional `sections[]` array with three kinds:

- `feature-grid` — three-column tile strip with `{ title, body }` items.
- `narrative` — heading + body copy + optional `media` image, two-column at ≥56rem.
- `quote` — pull quote with optional `attribution`.

### SEO + branding

The `seo` and `branding` blocks emit `og:`, `twitter:`, `link[rel=canonical]`, and `link[rel=icon]` tags via Starlight's `head:` frontmatter. `branding.accent` overrides the active theme's `--demo-accent` token via a sanitised inline style.

### Themes

Supported: `default`, `corporate`, `terminal`, `minimal`, `dashboard`, `playful`. Browse `/themes` on a generated site for a side-by-side gallery of palettes and typography — no need to scaffold six sites to compare.

Themes that force a single colour scheme (`corporate`, `terminal`, `minimal`, `dashboard`, `playful`) hide Starlight's theme toggle automatically; only `default` is light/dark adaptive.

Fonts are bundled via `@fontsource` packages and served from your own origin — no third-party CDN dependency, no GDPR concern, no render-blocking external requests.

## DX guardrails

- Missing site directory: clear error with `init` hint.
- Invalid site (missing `astro.config.mjs`): clear scaffold error.
- Missing input JSON: explicit file-not-found error.
- Unknown theme values: automatically fall back to `default`.
- `--strict` enforces missing-asset failures for CI reliability.
- `--allow-missing-assets false` offers the same behavior without enabling all strict defaults.
