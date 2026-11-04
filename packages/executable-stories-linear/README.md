# executable-stories-linear

Show your [executable-stories](https://github.com/jagreehal/executable-stories) results on the Linear issues your stories name.

Every story that says which issue it verifies:

```ts
story.init(task, { ticket: "PAY-12" });
```

gets one **Quality checks** attachment on that issue, updated in place by the next run: `CI main @ abc1234: 3 passed, 1 failed`, and **Quality checks passed** when everything behind the issue passes. No test issues are created, nothing is commented, and people reading Linear need no other tool.

## What people see in Linear

The attachment line on the issue shows the result: **Quality checks · CI acme/app main: 3 passed, 1 failed**. Opening it shows Linear's own attachment view, with no report site, account or login:

- **Attributes**: assertions observed, passes that asserted nothing, branch, commit, when it ran (UTC), and the Actions run number.
- **One entry per scenario, failures first**: the story's steps as written (`✓ Given …`, `✗ When …`), and for a failure the step it failed at and why (the error's first line).
- **Assertions**: a pass that observed no assertions says so (`this pass checked nothing`), so a green result is not taken as proof when nothing was checked. Frameworks that cannot count assertions are marked as such rather than shown as zero.

Detail is bounded to stay within Linear's guidance for attachment text: up to 25 steps per scenario and about 9,000 characters in all, ending with how many scenarios were left out and a link to the full report.

## Use it

```sh
npx executable-stories-linear publish            # reads .executable-stories/raw-run.json or reports/raw-run.json
npx executable-stories-linear publish run.json --dry-run
```

It reads a raw run as the framework reporters write it (`rawRunPath`), or a StoryReport (`executable-stories format --format story-report-json`).

| Option | Default | |
| --- | --- | --- |
| `--scope <name>` | `CI <owner/repo> <branch>` in Actions, `CI <branch>` in other CI, else `Local` | One attachment per issue per scope, so `CI main` and `nightly` sit side by side |
| `--link <url>` | the GitHub repository in Actions | Where the attachment links for good: your report site or the repository |
| `--run-url <url>` | the Actions run, or the run's `ci.url` | This run, kept in the attachment's details |
| `--trust <url>` | | Another writer's link whose status for the scope you share (repeatable) |
| `--videos <dir>` | | Also attach each scenario's `<dir>/<slug>.mp4` to its issues |
| `--dry-run` | | Print what would be posted; needs no key |
| `--json` | | Print the result as JSON |

Credentials: `LINEAR_API_KEY` (a personal key, `lin_api_…`; use one for a bot member, not a person) or `LINEAR_ACCESS_TOKEN` (OAuth).

Exit codes: `0` posted, or nothing to post; `1` Linear refused some issues (deleted, no access), the rest were still posted; `2` usage or setup error.

### Videos on the issue

```bash
npx executable-stories video reports/raw-run.json
npx executable-stories-linear publish reports/raw-run.json --videos reports/video
```

`--videos` uploads each scenario's MP4 into Linear's storage and attaches it to the issues the scenario names, one video per scenario and scope. A later publish with the same file uploads nothing. A changed file attaches first, then replaces the old attachment. Scenarios with no file in the folder stay as they are.

### GitHub Actions

```yaml
- run: pnpm test # your reporter writes reports/raw-run.json
- run: npx executable-stories-linear publish reports/raw-run.json
  if: always()
  env:
    LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
```

### One status per issue, whoever posts it

Each attachment records `source: "executable-stories"` and its scope, and CI scopes are named the same everywhere (`CI <owner/repo> <branch>`), so this CLI and the hosted Executable Stories app share one status per issue per scope.

A post lists that scope's statuses on the issue and creates one only when there are none. It then updates the one with the smallest id in place and deletes any others. Ids never change, so every writer keeps the same one: the smallest id ever created is deleted by nobody, which means two writers posting at once never leave none, and whichever finishes last removes the extra, so they never leave two. That status keeps the link it was created with; each post updates its title, subtitle and run link.

Only statuses from **trusted links** count. Anyone who can edit an issue can add an attachment that looks like ours, so a status is adopted, updated or removed only when its link names the issue (`executable-stories-ticket=PAY-12`) and falls under your own `--link` or a link you pass with `--trust` (repeatable; or `EXECUTABLE_STORIES_TRUSTED_LINKS`, comma-separated). A lookalike is left alone. To share one status with the hosted app, trust its address:

```sh
npx executable-stories-linear publish --trust https://<your-hosted-app>/requirements
```

Your own `--link` matches only its exact path. A `--trust` link matches by origin and path (the path or anything under it). Query parameters on a trusted link are requirements: `--trust https://app.example/requirements?project=abc` trusts only links that also carry `project=abc`.

### Which tickets are Linear's

A ticket is posted when its id looks like `TEAM-123` and it has no URL, or its URL is that issue in the key's workspace (`https://linear.app/<workspace>/issue/PAY-12`, with or without the slug). A ticket that links elsewhere (Jira, a doc) is left alone.

## As a library

```ts
import { createLinearClient } from "executable-stories-linear";
import { publishRun, readRun } from "executable-stories-trackers";

const client = await createLinearClient({ auth: { apiKey } }, { fetch });
const result = await publishRun({ report: readRun(text), client, scope: "CI main", link: repoUrl });
```

The tracker-agnostic part lives in [executable-stories-trackers](../executable-stories-trackers).

## Checking it against a real workspace

Set `SMOKE_VIDEO` to an MP4 to run the video checks with a real file.

`LINEAR_API_KEY=… pnpm --filter executable-stories-linear smoke` runs the built CLI against your workspace: it creates a throwaway issue, publishes twice, checks the attachment updated in place, and deletes the issue.
