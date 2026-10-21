---
'executable-stories-formatters': minor
'executable-stories-playwright': minor
'executable-stories-remotion': minor
'executable-stories-showcase': patch
---

Help-centre media for teams and agents.

- `docs review` writes one HTML page showing each slot's current image beside the new GIF or MP4, with the article section and the scenario's steps.
- `docs approve <slot>…` records who approved each file. With `"approval": true`, `publish` sends only approved files.
- `docs add <article | link> --image <n>` adds a slot and prints a scenario stub that quotes the article. It accepts a Help Scout or Confluence public link.
- `docs add`, `review`, `approve` and `publish` take `--json`.
- `docs list` gains `--images`, `--only gif`, views and update columns, and `--from <dir>` to read a local export (Markdown, HTML or Help Scout `.json`) from any folder.
- `status --wording` lists published steps the article no longer says. A slot can name its scenario by `tag`.
- `gif` and `video` resolve media against the run's `projectRoot`.
- Playwright: `story.upload(trigger, files)`, and `story.screenshot({ hold: 'auto' })` to hold each screen long enough to read.
- Remotion: `ArticleVideo` `quotes` accepts step numbers; `unmatchedQuotes` lists keys no step has.
- Showcase: `showCursor` rests the pointer at a focused field's right end, clear of the typed text.
