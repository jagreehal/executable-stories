---
"executable-stories-playwright": minor
"executable-stories-formatters": minor
---

Screenshots, GIFs and Markdown assets for product docs.

- `story.screenshot({ page, highlight, mask })` outlines the element a step is about and covers dates, IDs and other changing data with a grey box. Both apply to the capture only.
- `executable-stories gif <run>` writes one looping GIF per passing scenario from its step screenshots into `<output-dir>/gif`. It needs `ffmpeg` on `PATH`.
- `--asset-mode copy` writes inline screenshots in Markdown and Astro Markdown output to `assets/` as files, so docs pages stay small.
