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
executable-stories docs list --csv --images --only gif > gifs.csv
```

Share the CSV as the team's tracker: add owner and status columns. `--images` gives one row per
image with the heading it sits under, which is how people name them ("the import GIF"), and the
article's views where the help centre counts them, so the most-read articles go first.

An export of the articles works offline: Markdown or HTML files, or the `.json` files the Help Scout
API returns. `--from export` lists it against the slots in `docs.json`, even when they name articles
by id (`42` matches `export/42.html` or `export/42.json`). The folder can sit outside the project;
a relative path starts from `docs.json`'s folder. An exported HTML article's URL comes from
`<link rel="canonical">` or a comment holding just the URL; a `.json` export's from `publicUrl`.

## Start a slot

```bash
executable-stories docs add 42 --image 2
```

adds a slot for the second image in article `42` to `docs.json` and prints a scenario to record it,
one step per sentence the article says before that image. Fill in what each step does.

The article can be its public link instead, as people share it: a Help Scout
`…/article/16-how-to-create-payees` (looked up by its number), a Confluence page on the same site,
or, with `--from`, the exported file that carries that link.

## For an agent

`add`, `status`, `review`, `approve` and `publish` take `--json`. `add --json` prints the slot, the
article's section (title, link, heading, image, text) and the scenario stub, so an agent can write
the scenario without parsing text; `approve` and `publish` report each slot with the sha256 of the
file they approved or published.

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

`status` shows each slot as `changed`, `unapproved`, `published`, `failing` or `no media`. `publish`
puts each changed file into its article and records the placement in `docs.lock.json`. Commit the
lock: the next publish replaces the same image, and moving a slot to another article publishes it
afresh.

A slot names its scenario by `scenario` (its title) or `tag` (a tag on it, such as
`media:add-contact`), which keeps the slot when the scenario is renamed.

## Review and approve

```bash
executable-stories docs review --report reports/index.story-report.json --out review.html
executable-stories docs approve add-contact --by "Sam" --report reports/index.story-report.json
```

`review` writes one page that opens anywhere: for each slot, the image the article shows now beside
the new recording, the section it illustrates and the scenario's steps. Reviewers need no repo.
`approve` records who approved which file in `docs.approvals.json`. With `"approval": true` in
`docs.json`, `publish` sends only approved files, and a re-render needs approving again.

## When the article changes

`publish` notes which steps quote the article. `docs status --wording` reads each published article
and lists the steps it no longer says, so a reworded article flags its media for a new recording.

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
