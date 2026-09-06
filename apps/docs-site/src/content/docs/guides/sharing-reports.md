---
title: Sharing reports
description: Publish a report and its evidence to a link someone outside your repo can open
---

A generated HTML report is one file that links to others: the screenshots it
shows, the video of the run, any embedded HTML fragments. Emailing the file
sends a page with broken images. `executable-stories share` sends the report
and the files it points at, and prints a link.

```bash
executable-stories share reports/
```

## Why the CLI does the upload

The report is a static file. Opened from `file://` it has a null origin, so no
session to authenticate an upload with, and browsers block it from reading its
own `assets/` directory. The CLI has both, so it holds the key and streams the
evidence, and the report's optional Share button hands the reader this command.

## What it needs

Point it at the directory you generated into. It looks for `index.html`, then
`index.story-report.json`, then any `*.story-report.json`, then `raw-run.json`.
The HTML report comes first because it is the copy the Share button was clicked
on, and the copy `--asset-mode copy` rewrites to the bundled assets beside it;
its embedded report JSON is what gets published. A directory holding only
`--format html` output shares fine:

```bash
pnpm test
executable-stories format reports/raw-run.json \
  --format story-report-json --output-dir reports --output-name index
executable-stories share reports/
```

An API key comes from `EXECUTABLE_STORIES_API_KEY`, or `--key`. Prefer the
environment variable: a key on the command line lands in your shell history and
is visible to anyone who can list processes on the machine.

```bash
export EXECUTABLE_STORIES_API_KEY=es_...
executable-stories share reports/
```

## Who can open it

By default anyone holding the link can. To require a sign-in and limit it to
named people:

```bash
executable-stories share reports/ --emails alex@example.com,sam@example.com
```

A share is deleted after 30 days unless you say otherwise. `--expires-days 0`
never expires it.

## Options

| Option | What it does |
| --- | --- |
| `--key <es_...>` | API key. Default: `EXECUTABLE_STORIES_API_KEY`. |
| `--url <base>` | Cloud base URL. Default: `EXECUTABLE_STORIES_URL`, then `https://app.executablestories.com`. |
| `--title <text>` | Name the share. Default: the report's title. |
| `--emails <a@b,c@d>` | Only these people can open it, after signing in. |
| `--expires-days <n>` | Delete the share after n days. Default 30; 0 never expires. |
| `--json` | Print the response as JSON instead of prose. |

Exit codes: `0` shared, `1` rejected or failed, `4` usage error.

## What travels, and what does not

The report JSON goes to the app; the screenshots and videos go straight to
object storage through one presigned upload each, so the bytes never pass
through the application.

Assets are stored under names relative to the report. A file that lives outside
the report directory — a Playwright video in `test-results/`, say — is stored
under `assets/<filename>`, not under its path on your machine. Your directory
layout is not part of what you share.

A file the report references but that is no longer on disk is reported as a
warning and left out. The share still publishes: a report whose video was
cleaned up is worth reading, and the missing file is renamed to the key it
would have had, so a cleaned-up asset does not leak its old path either.
`projectRoot` is blanked for the same reason.

The share becomes visible only after every upload lands, so a half-uploaded
report is never something you can send to someone.

## The Share button in the report

Ask for the button and the HTML report shows one, so a reader who wants to send
the report on gets the command to run:

```bash
executable-stories format reports/raw-run.json --format html --html-share
```

Reports carry no button by default, which keeps an internal artifact free of a
hosted-service prompt. The `share` command works either way.
