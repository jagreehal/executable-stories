---
title: Theming
description: The HTML report and React renderer share one set of CSS tokens — light and dark out of the box, fully re-themeable with a single override.
---

The standalone HTML report and the React renderer (`executable-stories-react`) are the **same component tree**, themed through one set of CSS custom properties. There is nothing to pick between — light and dark work out of the box, and a single CSS override re-themes every surface.

## Light and dark

The report ships light and dark palettes. It follows the system `prefers-color-scheme` automatically, and the interactive report has a manual light/dark toggle. No flag or configuration is required.

## Re-theming with tokens

Every colour, font, radius, and spacing value is a `--es-*` CSS custom property. Override any of them on `:root` (or any ancestor of the report) to re-theme — the same override styles the standalone HTML report, the React component, and the Astro docs site.

```css
:root {
  --es-color-passed: #2e7d32;
  --es-color-failed: #c62828;
  --es-color-link: #1565c0;
  --es-radius: 0.75rem;
  --es-font-body: 'Inter', system-ui, sans-serif;
}
```

See the [React renderer reference](/reference/react-renderer) for the full token catalog and how to apply it inside a React app.

## HTML feature flags

The HTML report renders rich content from CDN libraries, loaded only when a report actually contains that content. Disable any of them at generation time:

| Flag | Effect |
|------|--------|
| `--html-no-syntax-highlighting` | Disable highlight.js code highlighting |
| `--html-no-mermaid` | Disable live Mermaid diagram rendering |
