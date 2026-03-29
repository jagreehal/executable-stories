---
title: HTML Themes
description: Choose from 6 built-in HTML report themes, each with light and dark mode support.
---

import ThemePreview from '../../../components/ThemePreview.astro';

Executable Stories ships with 6 HTML report themes. Every theme supports automatic light/dark mode detection and a manual toggle.

## Theme gallery

<ThemePreview basePath="screenshots" />

## Using a theme

Pass `--html-theme` to the CLI:

```bash
executable-stories format raw-run.json --format html --html-theme corporate
```

Or set it in the reporter config:

```typescript
html: {
  theme: 'corporate',
}
```

## Theme descriptions

### Default

Clean, modern design inspired by shadcn/ui. Cucumber green accent. Best for general-purpose reports.

### Corporate

Two-pane editorial layout with a fixed sidebar table of contents. Pass rate progress bar. Best for stakeholder-facing reports with many scenarios.

### Terminal

Monospace typography throughout. Retro console aesthetic. Best for developer-facing reports where code readability is primary.

### Minimal

Stripped-down, content-focused design with minimal visual decoration. Best for embedding in wikis or printing.

### Dashboard

Data-oriented layout optimized for metrics-heavy reports. Best when using history tracking and flakiness grades.

### Playful

Stylized with decorative touches and softer colors. Best for demo reports and presentations.

## Disabling features

All themes support these HTML feature flags:

| Flag | Effect |
|------|--------|
| `--html-no-syntax-highlighting` | Disable highlight.js code highlighting |
| `--html-no-mermaid` | Disable live Mermaid diagram rendering |
| `--html-no-markdown` | Disable Markdown section parsing |
