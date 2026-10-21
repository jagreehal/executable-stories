---
title: Help-centre media
description: Keep the GIFs and videos in your help centre in step with the scenarios that record them
---

A help-centre article shows a GIF of the product doing what the article says. Record it from a
passing scenario and you re-render it when the UI changes, instead of filming it again by hand.
The `docs` subcommand puts that media into the article: Markdown files in a repo, Help Scout Docs,
or Confluence pages.

## Find the backlog

`docs list` reads every article and its images, and marks the images no slot covers yet:

```bash
executable-stories docs list
executable-stories docs list --csv > backlog.csv
```

Share the CSV as the team's tracker. An export of the articles as HTML files works offline: point a
`markdown` target at the folder.

## Describe each slot

`docs.json` sits next to your reports. Each slot names an article, the rendered file, the image it
replaces on first publish, and the scenario that records it:

```json
{
  "target": { "type": "helpscout" },
  "slots": [
    {
      "id": "add-contact",
      "article": "5f1c0a2b",
      "file": "reports/gif/add-a-contact-via-the-interface.gif",
      "replaces": "old-add-contact.gif",
      "scenario": "add a contact via the interface"
    }
  ]
}
```

| Target                                       | `article` is            | Environment                                                   |
| -------------------------------------------- | ----------------------- | ------------------------------------------------------------- |
| `{ "type": "markdown", "dir": "docs" }`      | a file path under `dir` | none                                                          |
| `{ "type": "helpscout", "collections": [] }` | the article id          | `HELPSCOUT_API_KEY`                                           |
| `{ "type": "confluence", "spaceId": "ENG" }` | the page id             | `CONFLUENCE_BASE_URL`, `CONFLUENCE_EMAIL`, `CONFLUENCE_TOKEN` |

`file` must be a GIF, PNG, JPEG, WebP, MP4 or WebM, by extension and by its first bytes, so a
slot can only publish media.

Credentials and the Confluence host come from the environment, so a pull request that edits
`docs.json` cannot send them anywhere else. `collections` and `spaceId` only scope `docs list`.

## Publish

```bash
executable-stories docs status --report reports/index.story-report.json
executable-stories docs publish --report reports/index.story-report.json
```

`status` shows each slot as `changed`, `published`, `failing` or `no media`. `publish` puts each
changed file into its article and records the placement in `docs.lock.json`. Commit the lock: the
next publish replaces the same image, and moving a slot to another article publishes it afresh.

`publish` checks the article before it uploads anything. The image to replace must appear exactly
once; with `--report`, the slot's scenario must have passed, and its title must be unique in the
report.

`docs` reads images as Markdown `![](src)`, HTML `<img src>`, and Confluence `<ac:image>` with an
attachment or an external URL. Publishing to Confluence turns an external image into the uploaded
attachment.

## A video beside the article

`<ArticleVideo>` in `executable-stories-remotion` plays the recording next to the article's own
steps, highlighting the one on screen. See [Videos with Remotion](/guides/videos-with-remotion/).

The `article-walkthrough` skill walks an agent through the whole loop, from the article to a
published GIF.
