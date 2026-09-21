---
name: cloud-change-aware-testing
description: Use when a pull request should run the tests that the change can break rather than the whole suite, or when a merge or deploy should be blocked by the organisation's release policy — wiring `push --base`, reading the recommended scope, and gating with `--gate` or the GitHub Action's ingest mode. Triggers include "only run affected tests", "what should I run for this diff", "block the merge if the gate fails", "set up ingest in CI".
---

# Change-aware testing and gates

The cloud knows which product files each story `covers`, across every run it
has seen. Given the files a change touched, it recommends the stories to run
and, once they ran, says whether the commit is safe to release. The pieces:

| Piece | Where |
| --- | --- |
| Attach the diff to a push | `executable-stories push … --base <ref>` |
| Read the recommendation | the push response: `recommendations[]` with reasons |
| Gate on the release policy | `push … --gate` (exit 5) or `GET /api/v1/releases/gate` |
| All of it in CI | `jagreehal/executable-stories-action@v2` with `mode: ingest` |

## Locally: what should I run for this diff?

```bash
executable-stories push reports/raw-run.json --base origin/main
```

`--base` sends the files changed since the ref. The response lists the
scenarios worth running for the change, each with the reason (which covered
file changed). Relay the reasons. Then run that scope with the framework's
own filter (`vitest -t`, `playwright --grep`, the "Run locally" command on the
catalogue row) and push again.

A run pushed after a focused rerun carries only the files it ran; the cloud
merges it into the suite's known state per scenario, so a narrowed run never
reads as a mass deletion.

## In CI: GitHub Actions

```yaml
- uses: jagreehal/executable-stories-action@v2
  with:
    mode: ingest
    raw-run: reports/raw-run.json
    api-key: ${{ secrets.EXECUTABLE_STORIES_API_KEY }}
    ingest-url: https://app.executablestories.com
    ingest-gate: true
```

Under Actions the action needs nothing else: repo, branch, SHA come from the
environment; the base commit and PR number from the event payload. The run
URL and recommended scope go to the job summary, the run id to
`$GITHUB_OUTPUT` as `ingest-run-id`. On a pull request a blocked gate posts
its reasons as the PR comment and annotates the Checks tab **before** the
step fails, so the developer reads why rather than a bare red X.

Any other CI: `executable-stories push reports/raw-run.json --gate`, which
exits 5 when the org's policy blocks the commit and names every reason.

## Reading a gate

`{ status, blocking[], warnings[] }`:

- `blocking` non-empty: the commit is not releasable. Quote each check by
  name and reason.
- `warnings` only: releasable; surface them, do not hide them.
- `status: "no-release"`: no release covers this commit. Neither a failure
  nor permission; say there is nothing to gate on.

An unreachable gate fails. `--force` covers the wire (network, auth), never
the verdict: a blocked gate still exits 5 under `--force`.

## Rules

- Recommend the scope; never silently narrow the suite. The user or the
  pipeline decides to run less.
- Never turn a `no-release` into a pass.
- Keep the whole-suite run on the default branch; change-aware scope is for
  the PR loop.
