---
title: Story Docs
description: Living documentation generated from your executable stories.
---

## Welcome

This site contains living documentation generated from your test stories.

### Getting started

Run your tests and generate Astro-formatted docs:

```bash
executable-stories format run.json --format astro --output-dir src/content/docs/stories --asset-mode copy
```

Generate explorer data:

```bash
executable-stories format run.json --format story-report-json --output-dir public/stories --output-name story-report
```

Then open `/stories/` in the Astro site.

Then start the dev server:

```bash
npm run dev
```
