---
"executable-stories-core": minor
"executable-stories-react": minor
"executable-stories-formatters": patch
"executable-stories-init": patch
"executable-stories-vitest": patch
---

The HTML report previews text attachments inline: `text/plain` as preformatted text, `text/markdown` rendered like `story.section`, and `text/html` in the sandboxed `story.html` frame. Each keeps its download link.

Attachments kept as file references carry `external: true` in the canonical model and StoryReport v1, and the report links to the file.

Runtime dependencies updated.
