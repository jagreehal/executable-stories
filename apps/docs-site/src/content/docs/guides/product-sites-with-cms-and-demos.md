---
title: Product sites with CMS and demos
description: Publish customer-facing product demo sites from your Playwright runs with executable-stories-demo
---

The `executable-stories-demo` package turns a Playwright run into a published product demo site — a customer-facing page with a hero, a featured scenario video, capability stats, and a list of every verified user journey. Use it to ship the same artefacts your sales-engineering team would build by hand, but always in sync with what the product actually does.

It is the sibling of the [Astro docs site guide](/guides/astro-docs-site/): same generator, different audience. The docs site speaks to engineers; the demo site speaks to buyers.

## Install

```bash
pnpm add -D executable-stories-demo executable-stories-formatters
```

## Scaffold a site

```bash
executable-stories-demo init my-demo-site
cd my-demo-site
pnpm install
```

This creates an Astro Starlight site with six built-in themes, self-hosted fonts (no third-party CDN), and a `demo.config.json` you can edit to brand the site.

## Build from a Playwright run

```bash
executable-stories-demo build \
  --input reports/raw-run.json \
  --site my-demo-site
```

The build copies scenario media (screenshots, videos) into `public/demo-assets`, generates per-scenario pages, and writes a landing page using the splash template by default.

## Configure the landing page

Edit `demo.config.json`:

```json
{
  "productName": "Acme Checkout",
  "tagline": "One link, every payment method, real receipts.",
  "theme": "playful",
  "template": "splash",
  "cta": {
    "primary": "Try it free",
    "url": "https://acme.example.com/signup"
  },
  "featured": {
    "scenario": "stories/checkout/happy-path"
  },
  "stats": { "mode": "capability" },
  "branding": {
    "logo": "/brand/logo.svg",
    "ogImage": "/brand/og.png",
    "favicon": "/brand/favicon.svg",
    "accent": "#ff5722"
  },
  "seo": {
    "title": "Acme Checkout — verified user journeys",
    "description": "Watch the product run end-to-end.",
    "twitter": "@acme",
    "canonical": "https://demo.acme.example.com/"
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
    {
      "kind": "quote",
      "quote": "Replaced our static deck.",
      "attribution": "Sales engineer, Acme"
    }
  ]
}
```

## Templates

- **`splash`** (default) — product-page chassis: hero with logo + CTA, optional featured scenario with inline media, capability-framed stats, custom feature-grid / narrative / quote sections, scenario list. Designed for customers and prospects.
- **`dashboard`** — engineering test-report layout: hero, test-mode stats (Passed / Failed / Skipped), story list. The original demo behaviour.

## Stats modes

- **`capability`** (splash default) — buyer-friendly: total scenarios + verified count.
- **`test`** (dashboard default) — engineering view: passed / failed / skipped.
- **`off`** — hide the stats strip entirely.

## Featured scenario

Set `featured.scenario` to a story slug like `stories/checkout/happy-path`. The first video or image attachment from that scenario is rendered inline beneath the hero, with a "Read the full scenario →" link to its dedicated page. Splash mode only.

## Themes

Six themes ship with the scaffold: `default` (editorial), `corporate` (institutional), `playful` (risograph), `terminal` (phosphor CRT), `dashboard` (ops room), `minimal` (aggressive restraint). Browse `/themes` on a generated site to compare palettes side-by-side without scaffolding multiple sites.

Themes that force a single colour scheme (`corporate`, `terminal`, `minimal`, `dashboard`, `playful`) hide Starlight's theme toggle automatically; only `default` is light/dark adaptive.

## SEO and branding

The `seo` and `branding` blocks emit `og:`, `twitter:`, `link[rel=canonical]`, and `link[rel=icon]` tags via Starlight's frontmatter `head:` block. `branding.accent` overrides the active theme's `--demo-accent` token via a sanitised inline style — useful for matching brand colour without forking a theme.

## Preview locally

```bash
executable-stories-demo preview --site my-demo-site
```

## CI and asset reliability

For CI builds, treat missing assets as failures rather than silently skipping them:

```bash
executable-stories-demo build \
  --input reports/raw-run.json \
  --site my-demo-site \
  --strict
```

You can also customise where attachments land in the published site:

```bash
executable-stories-demo build \
  --input reports/raw-run.json \
  --site my-demo-site \
  --assets-dir public/media \
  --assets-base-url /media
```

## How this differs from the docs site

The Astro docs site (see [Astro docs site](/guides/astro-docs-site/)) targets engineering audiences: sidebar navigation, full scenario detail, every step rendered. The demo site targets buyers: a tight product page that highlights one or two scenarios and links into the rest. Use the docs site internally; ship the demo site to the public.
