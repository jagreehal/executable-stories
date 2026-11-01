---
title: Results on Linear issues
description: Post each run to the Linear issues your stories name, as one attachment per issue that updates in place
---

Name the issue a story verifies:

```ts
story.init(task, { ticket: 'PAY-12' });
```

Then publish the run from CI:

```sh
npx executable-stories-linear publish reports/raw-run.json
```

PAY-12 gets one **Quality checks** attachment that reads `CI acme/app main: 3 passed, 1 failed`, or **Quality checks passed** once every scenario behind it passes. The next run of the same scope updates that attachment. It never adds a second one, creates test issues or comments.

Opening the attachment shows Linear's own modal. You see one entry per scenario, failures first, with its steps (`✓ Given …`, `✗ When …`), the step it failed at and the error's first line. A pass that observed no assertions says so, and the attributes show the branch, commit, run time and Actions run.

## GitHub Actions

```yaml
- run: pnpm test # your reporter writes reports/raw-run.json
- run: npx executable-stories-linear publish reports/raw-run.json
  if: always()
  env:
    LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
```

Use a personal key (`lin_api_…`) for a bot member, or `LINEAR_ACCESS_TOKEN` for OAuth. In Actions the scope defaults to `CI <owner/repo> <branch>` and the link to the repository. Elsewhere, pass `--link`. Try it with `--dry-run` first: it prints what it would post and needs no key.

## Scopes

Each scope keeps its own attachment, so `--scope nightly` sits beside `CI acme/app main` on the same issue. Writers that share a scope share one attachment. To share it with another writer, such as the hosted app, pass that writer's link with `--trust <url>` (repeatable) or `EXECUTABLE_STORIES_TRUSTED_LINKS`. The CLI leaves attachments with any other link alone.

## Which tickets count

The CLI posts a ticket when its id looks like `TEAM-123` with no URL, or its URL is that issue in the key's workspace. It leaves tickets that link to Jira or a doc alone.

Exit codes: `0` posted or nothing to post, `1` Linear refused some issues (the rest still posted), `2` usage or setup error.

The package README covers every option and the library API: [executable-stories-linear](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-linear). To post receipts from an agent session over Linear MCP instead, use the `linear-evidence-review` skill.
