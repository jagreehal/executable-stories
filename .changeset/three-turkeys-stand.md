---
'executable-stories-formatters': minor
---

HTML-first report improvements and Storybook coverage for every renderer.

- Default output format is now `html` (was `cucumber-json`).
- ✨ Copy-as-Claude-prompt button on failed scenarios — copies steps + error + source as a ready-to-paste prompt for AI investigation.
- Persist collapse/expand state in localStorage so navigation across reloads keeps your context.
- Mobile responsive refinements: header stacks, action buttons stay visible on touch, search input becomes full-width.
- Storybook now covers every HTML renderer (doc-entries, scenario, steps, feature, error-box, failure-summary, tag-bar, toc, trace-view, meta, attachments, status, step-params), plus a `FullReport` composition and the `RunDiffHtml` formatter. Mermaid diagrams render live inside Storybook via the preview decorator.
