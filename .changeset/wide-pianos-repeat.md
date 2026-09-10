---
"executable-stories-formatters": patch
---

`assetMode: "copy"` now bundles the `markdown` report's assets as well as `html`
and `astro-markdown`. Referenced screenshots and videos are copied to `assets/`
beside the markdown and the paths rewritten, so a committed markdown report
carries its own media.
