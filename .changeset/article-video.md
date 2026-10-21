---
'executable-stories-remotion': minor
'executable-stories-formatters': minor
---

Help-centre media from your scenarios.

- `<ArticleVideo>` plays a Playwright recording beside the article it illustrates: a title card, an optional table scene, the recording with the article's steps (the one on screen highlighted), and an outro linking the article. `quotes` maps step text to the article's wording; `articleVideoFrames` sizes the composition.
- `executable-stories docs list | status | publish` keeps help-centre GIFs and videos in step with the scenarios that record them, in Markdown files, Help Scout Docs or Confluence. `docs.json` names each slot; `publish` replaces exactly one image per slot, only for passing scenarios, and records each placement in `docs.lock.json`. `list --csv` gives the backlog of images no slot covers yet.
- New `article-walkthrough` skill: from an article to a recorded, reviewed and published GIF or video.
