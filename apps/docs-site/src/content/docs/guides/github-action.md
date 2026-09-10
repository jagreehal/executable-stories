---
title: GitHub Action
description: Surface executable stories in pull requests, gate release candidates, and record deployments.
---

The [executable-stories-action](https://github.com/jagreehal/executable-stories-action) posts your story output directly into pull requests. Each PR gets a comment that leads with a verdict and a ranked list of findings, annotations on the changed files, and the full HTML report as a downloadable artifact.

> The action is developed in the [executable-stories monorepo](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-action) and mirrored to `jagreehal/executable-stories-action`, so `uses: jagreehal/executable-stories-action@v2` keeps working. File issues and PRs against the monorepo.

It also supports release workflows:

- `report` — default PR report mode
- `gate-release` — compare a release candidate against a dev baseline
- `deploy` — record a deployment in the environment ledger

Works with all supported frameworks. Zero configuration for the common case.

## Quick start

Add to your workflow after the test step:

```yaml
- uses: jagreehal/executable-stories-action@v2
```

The action auto-detects your test output. No inputs are required for the default flow.

## Prerequisites

The action does **not** run your tests — it surfaces the output of an `executable-stories` reporter that has already run. You need one of these set up first:

| Framework | Setup guide |
|---|---|
| Vitest | [Installation (Vitest)](/getting-started/installation-vitest/) |
| Jest | [Installation (Jest)](/getting-started/installation-jest/) |
| Playwright | [Installation (Playwright)](/getting-started/installation-playwright/) |
| Cypress | [Installation (Cypress)](/getting-started/installation-cypress/) |
| pytest | [Installation (pytest)](/getting-started/installation-pytest/) |
| Go | [Installation (Go)](/getting-started/installation-go/) |
| Rust | [Installation (Rust)](/getting-started/installation-rust/) |
| Ruby (Minitest) | [Installation (Ruby)](/getting-started/installation-ruby/) |
| JUnit 5 (Kotlin) | [Installation (JUnit 5)](/getting-started/installation-junit5/) |
| xUnit (C#) | [Installation (xUnit)](/getting-started/installation-xunit/) |

If your test command does not produce **either** `reports/test-results.{html,md}` **or** `.executable-stories/raw-run.json`, the action has nothing to surface and will fail with a "no reports found" error. See [Troubleshooting](#troubleshooting).

## How it works

The action checks for test output in two places, in order:

1. **Pre-generated reports** — if `reports/test-results.html` and `reports/test-results.md` exist (the default output from JS/TS framework reporters), the action uses them directly.
2. **Raw run JSON** — if `.executable-stories/raw-run.json` exists (the default output from non-JS adapters like pytest, Go, Rust, JUnit 5, xUnit), the action downloads the `executable-stories` CLI binary and generates the reports.

In both cases the action then:

- Uploads `test-results.html` as a workflow artifact
- Posts (or updates) a PR comment that leads with a verdict and a ranked list of findings
- Annotates the changed files in the diff, so findings appear next to the code
- Writes the same summary to the job summary, so a push or scheduled build is not silent
- Sets outputs you can chain to subsequent steps

## Examples by framework

All examples assume you already have an executable-stories reporter configured (see [Prerequisites](#prerequisites)).

### Vitest, Jest, Playwright

The reporter generates HTML and Markdown directly:

```yaml
name: CI
on: [pull_request]
permissions:
  pull-requests: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: pnpm install
      - run: pnpm test

      - uses: jagreehal/executable-stories-action@v2
        if: always()  # post the comment even when tests fail
```

### Cypress

```yaml
name: CI
on: [pull_request]
permissions:
  pull-requests: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: pnpm install
      - run: pnpm cypress run

      - uses: jagreehal/executable-stories-action@v2
        if: always()
```

### Python (pytest)

```yaml
name: CI
on: [pull_request]
permissions:
  pull-requests: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -e ".[test]"
      - run: pytest

      - uses: jagreehal/executable-stories-action@v2
        if: always()
```

### Go

```yaml
name: CI
on: [pull_request]
permissions:
  pull-requests: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "1.22"
      - run: go test ./...

      - uses: jagreehal/executable-stories-action@v2
        if: always()
```

### Rust

```yaml
name: CI
on: [pull_request]
permissions:
  pull-requests: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo test

      - uses: jagreehal/executable-stories-action@v2
        if: always()
```

### Ruby (Minitest)

```yaml
name: CI
on: [pull_request]
permissions:
  pull-requests: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: "3.3"
          bundler-cache: true
      - run: bundle exec rake test

      - uses: jagreehal/executable-stories-action@v2
        if: always()
```

### JUnit 5 (Kotlin)

```yaml
name: CI
on: [pull_request]
permissions:
  pull-requests: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "21"
      - run: ./gradlew test

      - uses: jagreehal/executable-stories-action@v2
        if: always()
```

### xUnit (C#)

```yaml
name: CI
on: [pull_request]
permissions:
  pull-requests: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "8.0"
      - run: dotnet test

      - uses: jagreehal/executable-stories-action@v2
        if: always()
```

## Recipes

### Always post the comment, even on test failure

Without `if: always()`, the action only runs if the previous step succeeded. For test feedback, you almost always want the comment to post even when tests fail:

```yaml
      - run: pnpm test

      - uses: jagreehal/executable-stories-action@v2
        if: always()
```

### Multiple reports per PR

You can run the action more than once per workflow — for example, separate Vitest and Playwright suites that should each get their own PR comment. Use a unique `comment-title` for each invocation; the action looks for an existing comment matching `<!-- executable-stories: ${comment-title} -->`, so distinct titles produce distinct comments that update independently:

```yaml
      - run: pnpm test:unit
      - if: always() && hashFiles('docs/evidence/vitest-tests.html') != ''
        uses: jagreehal/executable-stories-action@v2
        with:
          report-dir: docs/evidence
          output-name: vitest-tests
          artifact-name: executable-stories-vitest
          comment-title: Vitest Stories

      - run: pnpm test:e2e
      - if: always() && hashFiles('docs/evidence/playwright-tests.html') != ''
        uses: jagreehal/executable-stories-action@v2
        with:
          report-dir: docs/evidence
          output-name: playwright-tests
          artifact-name: executable-stories-playwright
          comment-title: Playwright Stories
```

The `hashFiles(...)` guards skip the action when a test suite produced no output (e.g. an earlier suite errored before writing).

### Gate a release candidate

Use `mode: gate-release` when a release branch or release candidate must match the behavior already tested in dev:

```yaml
jobs:
  release-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: pnpm install
      - run: pnpm test

      - uses: jagreehal/executable-stories-action@v2
        with:
          mode: gate-release
          gate-dev-run: reports/dev.raw-run.json
          raw-run: .executable-stories/raw-run.json
          report-dir: reports/release
          output-name: rc-gate
```

The gate fails if scenarios from the dev baseline are missing from the release candidate, or if previously passing scenarios regress. Add `gate-fail-on-new: "true"` when new scenarios in the release candidate should fail the gate too.

Allowed exceptions can be stored in a policy file:

```json
{
  "allowedOmissions": ["src-checkout-story-test--legacy-coupon-flow"],
  "allowedRegressions": []
}
```

```yaml
      - uses: jagreehal/executable-stories-action@v2
        with:
          mode: gate-release
          gate-dev-run: reports/dev.raw-run.json
          raw-run: reports/rc.raw-run.json
          gate-release-policy: .executable-stories/release-policy.json
```

See [Release confidence](/guides/release-confidence/) for the CLI equivalent.

### Record a deployment

Use `mode: deploy` after a deployment step to record which scenario set is now live in an environment:

```yaml
      - uses: jagreehal/executable-stories-action@v2
        with:
          mode: deploy
          raw-run: reports/prod.raw-run.json
          deploy-env: production
          deploy-tag: v2.4.0
          deploy-ledger: .executable-stories/deployments.json
```

The ledger is written in the job workspace. Persist it as an artifact, cache, or committed release-evidence file if another job should compare environments later.

### Publish run JSON for a multi-repo docs hub

Use `mode: publish-run` after tests to commit the run JSON to an orphan branch (`executable-stories-runs`, created automatically), giving it a stable `raw.githubusercontent.com` URL that a company-wide docs hub can fetch at build time:

```yaml
permissions:
  contents: write   # commit to the runs branch

steps:
  - uses: actions/checkout@v4
  - run: npm test   # writes the run JSON
  - uses: jagreehal/executable-stories-action@v2
    with:
      mode: publish-run
      raw-run: reports/raw-run.json
```

Unchanged runs are skipped, so scheduled builds add no empty commits. The action
validates the run's transform-safe structure before touching the API and refuses
to let a late, older `finishedAtMs` overwrite a newer published run, including
when the existing JSON is too large for inline Contents API data. See the
[multi-repo docs hub guide](/guides/multi-repo-docs-hub/) for the full picture:
one Astro site collating the published runs from every repo.

### Render screenshots inline in PR comments (opt-in)

By default, media referenced in your stories stays in the HTML artifact and the comment shows a `📎 alt (see HTML report)` label. A comment cannot fetch either shape your run produces:

| In the markdown | Where it comes from | Why a comment cannot show it |
| --- | --- | --- |
| `![alt](data:image/png;base64,…)` | a reporter inlining the bytes | GitHub blocks `data:` URIs in comment markdown |
| `![alt](assets/dashboard.png)` | `--asset-mode copy`, and Playwright's colocated reports | GitHub resolves relative image paths in a repository file, never in a comment |

A label is honest where a broken image icon is not, which is why that is the default. To make them render inline instead, opt in:

```yaml
permissions:
  pull-requests: write
  contents: write          # required: action commits images on a dedicated branch

jobs:
  test:
    steps:
      # ...run tests...
      - uses: jagreehal/executable-stories-action@v2
        with:
          host-images: branch
          # images-branch: executable-stories-images   # optional, this is the default
```

What this does:

- Per PR run, the action commits each screenshot and video to an orphan branch (`executable-stories-images` by default) under `pr-{number}/{run-id}/`. Both shapes above are covered, and the same file referenced twice uploads once
- The PR comment is rewritten to `https://raw.githubusercontent.com/...` URLs, so screenshots render inline
- The branch is created automatically on first use, with a small README explaining what it is. Old `pr-*/` directories are safe to delete at any time
- If the upload fails (e.g. `contents: write` not granted, or a concurrent run races on the ref), the action falls back to labels and posts a warning. The comment still renders cleanly.

Limits, each announced in a warning rather than failing the run — what fits is hosted, the rest stays in the HTML report:

| Limit | Why |
| --- | --- |
| 10 MB per file | A PR comment is not the place for a full session recording. |
| 50 files and 50 MB per run | Every asset costs one API call, and `GITHUB_TOKEN` gets roughly a thousand an hour per repo. A three-hundred-frame storyboard would otherwise spend the job's whole budget on screenshots and then fail the calls that post the comment. |
| Nothing outside the workspace | Report content is not trusted input — on a fork PR the paths in it come from a contributor's code, and hosting is a publish. `![x](../../../etc/passwd)` is dropped rather than committed to a public branch. |

**Videos become a link, never a player.** `<video>` is not in GitHub's comment HTML allowlist, so the tag renders as nothing at all — the one asset shape that fails silently. The action rewrites it to `▶️ Watch the recording` pointing at the hosted file, or to a `▶️ Video (see HTML report)` label when it is not hosted. A real inline player needs the media uploaded through `user-attachments`, which only `gh pr comment --attach` can do — not the API this action posts through.

> **Concurrency note.** The action commits using the GitHub Git Data API by referencing the branch's current tip as the parent. If two PR runs touch the same `images-branch` simultaneously, the second `updateRef` call will fail with a non-fast-forward error and the action will fall back to placeholders for that run. There's no retry yet — see [executable-stories-action#1](https://github.com/jagreehal/executable-stories-action/pull/1) for context. For most repos this is rare; if you regularly run many parallel PRs and need bullet-proof inline images, consider giving each workflow a different `images-branch`.

### Custom output paths

If your reporter is configured with custom `outputDir` or `outputName`:

```yaml
      - uses: jagreehal/executable-stories-action@v2
        with:
          report-dir: docs/stories
          output-name: user-stories
```

### Pinned formatter version

Pin the `executable-stories` CLI version that the action downloads (only relevant for the raw-JSON path used by non-JS adapters):

```yaml
      - uses: jagreehal/executable-stories-action@v2
        with:
          formatter-version: "0.7.3"
```

### Using the action's outputs

```yaml
      - id: stories
        uses: jagreehal/executable-stories-action@v2

      - name: Echo report paths
        run: |
          echo "html: ${{ steps.stories.outputs.html-report-path }}"
          echo "md:   ${{ steps.stories.outputs.markdown-report-path }}"
          echo "comment id: ${{ steps.stories.outputs.comment-id }}"
```

## Inputs

| Input | Default | Description |
|---|---|---|
| `mode` | `report` | `report`, `review`, `gate-release`, `deploy`, or `publish-run` |
| `report-dir` | `reports` | Directory containing or receiving generated reports |
| `output-name` | `test-results` | Base filename for reports (without extension) |
| `raw-run` | `.executable-stories/raw-run.json` | Path to raw run JSON |
| `formatter-version` | `latest` | Version of `executable-stories` binary (`latest` or semver, e.g. `0.7.12`) |
| `artifact-name` | `executable-stories-report` | Name for the uploaded GitHub artifact. Carries the HTML report and its `assets/` directory, so referenced screenshots and videos open. |
| `comment-title` | `Executable Stories` | Header text for the PR comment; also used as the marker that lets the action find and update its own comment on subsequent runs |
| `host-images` | `false` | Set to `branch` to commit screenshots and videos to an orphan branch, so screenshots render inline in the PR comment and videos become a link. Requires `contents: write`. See [Render screenshots inline](#render-screenshots-inline-in-pr-comments-opt-in). |
| `images-branch` | `executable-stories-images` | Branch used when `host-images: branch`. Holds screenshots and videos. Created as orphan on first use. |
| `gate-dev-run` | — | `gate-release`: dev baseline raw run JSON |
| `gate-fail-on-regression` | `true` | `gate-release`: regression check is enabled by default |
| `gate-fail-on-removal` | `true` | `gate-release`: missing-scenario check is enabled by default |
| `gate-fail-on-new` | `false` | `gate-release`: fail when the RC contains scenarios absent from dev |
| `gate-release-policy` | — | `gate-release`: path to allowed omissions/regressions JSON |
| `deploy-env` | — | `deploy`: environment name, e.g. `dev`, `staging`, `production` |
| `deploy-tag` | — | `deploy`: optional tag or release label |
| `deploy-ledger` | `.executable-stories/deployments.json` | `deploy`: ledger path |
| `runs-branch` | `executable-stories-runs` | `publish-run`: branch the run JSON is committed to. Created as orphan on first use |
| `runs-path` | `raw-run.json` | `publish-run`: path of the published file within `runs-branch` |

## Outputs

| Output | Description |
|---|---|
| `html-report-path` | Path to the generated HTML report file |
| `markdown-report-path` | Path to the generated Markdown report file |
| `comment-id` | Numeric ID of the PR comment that was created or updated. Empty string when the action runs outside a `pull_request` event. |
| `gate-failed` | `true` when `gate-release` detected a release gate failure |
| `deploy-ledger-path` | Ledger path written in `deploy` mode |
| `published-run-url` | `publish-run`: stable `raw.githubusercontent.com` URL of the published run JSON |

## Permissions

The minimum required permissions:

```yaml
permissions:
  pull-requests: write   # post and update PR comments
```

If you opt in to `host-images: branch`, also grant `contents: write` so the action can commit screenshots and videos to the images branch:

```yaml
permissions:
  pull-requests: write
  contents: write
```

For PRs from forks, GitHub restricts the default `GITHUB_TOKEN` to read-only — see [FAQ](#faq) for workarounds.

## What you see in PRs

The comment answers "can I merge this?" before you expand anything:

```
## Executable Stories

**Merge risk: 🔴 High** · 1 scenario failed, 2 changed files ship with no evidence

❌ 1 failed · 🔴 2 uncovered · 🟠 1 weak · 🟢 4 covered · ✅ 11/12 scenarios passed

### Findings (4)

▸ ❌ Unproven claim: Checkout blocks a suspended user — src/cart/checkout.e2e.test.ts:12
▸ 🔴 Changed with no evidence — src/cart/discount.ts
▸ 🟡 Weak evidence only — src/cart/totals.ts

▸ 🤖 Prompt for AI agents
▸ 📖 Full report
```

Each invocation produces:

- **A verdict line.** `Merge risk` is graded on the worst finding, not the count: one red
  scenario outranks ten weakly evidenced files, because a red scenario is a claim the change
  does not honour. Grades are High / Moderate / Low / Clear.
- **A counts strip** — failed, unasserted, uncovered, weak, covered, and how many scenarios
  passed. Zeroes are omitted.
- **Ranked findings**, worst first, each collapsible and each carrying **How this was verified**
  so a reader can check the claim rather than take it. Four kinds:

  | Finding | Severity | What it means |
  | --- | --- | --- |
  | `failed` | Blocker | A scenario states a claim about the change and does not pass. |
  | `unasserted` | Major | A scenario passed without asserting anything, so it cannot fail and proves nothing. Worse than a missing test, because it reads as proof. |
  | `uncovered` | Major | A changed source file has no claim behind it at all. |
  | `skipped` | Minor | A scenario did not run, so its claim is unproven. Deliberately the mildest kind — otherwise every `it.skip` blocks a merge. |
  | `weak` | Minor | A changed file's only claims are weakly evidenced. |
  | `policy` | Blocker or Minor | An organisation release policy this commit does not satisfy. Decided by Executable Stories Cloud rather than by this run, so it is the one kind with no file to anchor to. |

  `uncovered`, `weak` and `skipped` need `mode: review`, which correlates the run to the PR
  diff. `policy` comes from `mode: ingest` with `ingest-gate: true`. Everything else works in
  the default `report` mode.
- **A "Prompt for AI agents" block** you can paste straight into a coding agent. It opens by
  naming its own contents as untrusted data, because scenario titles and error messages are
  attacker-influenced in any repo that takes contributions.
- **Inline annotations** on the changed files — blockers as errors, majors as warnings, minors
  as notices — so findings show up in the Files changed tab.
- **A job summary** carrying the same content, so runs with no PR still report.
- The full Markdown story output, collapsed, and a link to the HTML artifact. The artifact
  carries the report's `assets/` directory alongside the HTML, so the screenshots and videos
  a `📎` label points at actually open.
- (Optional, with `host-images: branch`) Screenshots rendered inline in the comment, and
  videos as a link. See [Render screenshots inline](#render-screenshots-inline-in-pr-comments-opt-in).

`mode: review` also writes `reports/<output-name>.review.json` — the machine contract behind
all of the above (ranked findings, evidence bands, per-claim strength). Read that rather than
scraping the comment if you are building on top of it.

On subsequent pushes to the same PR, the comment is **updated in place** rather than duplicated,
and an unchanged body is skipped entirely rather than re-posted.

Each invocation is independent. A workflow may use this action more than once (see
[Multiple reports per PR](#multiple-reports-per-pr)), and every file the action passes
between its own steps is cleared at the start of each invocation — so a second suite can
never render the first suite's screenshots, verdict, or comment body. Both suites
conventionally reference `assets/…`, so without that the swap would be silent. Comments are matched by an HTML marker (`<!-- executable-stories: ${comment-title} -->`), so the same `comment-title` always updates the same comment, while different titles produce different comments (see [Multiple reports per PR](#multiple-reports-per-pr)).

## Troubleshooting

### "No reports found"

The action's first step says it could not find pre-generated reports or a raw run JSON. Causes:

- Your test command finished but did not write anything to `reports/test-results.{html,md}` or `.executable-stories/raw-run.json`. Check the reporter is wired up — see [Prerequisites](#prerequisites) for the per-framework setup guide.
- You configured a custom output path. Match it with `report-dir` / `output-name` (or `raw-run` for the JSON path).
- The previous step (your test runner) errored before writing output, and you did not use `if: always()` on the action step.

### The PR comment never appears

- Confirm the workflow has `permissions: pull-requests: write`.
- Confirm the action ran on a `pull_request` event (not a `push` to a branch — the action only comments on PRs).
- For PRs from forks, the default `GITHUB_TOKEN` is read-only by design; the action will silently skip the comment step. See [FAQ](#faq).

### Screenshots show as 📎 labels, not images

This is the default, and it applies to both an inlined `data:` URI and a relative `assets/…` path — a comment can fetch neither, so a label is shown instead of a broken image. Opt in to [host-images: branch](#render-screenshots-inline-in-pr-comments-opt-in) to render them inline. The media is in the HTML artifact either way.

A video is labelled `▶️ Video (see HTML report)` rather than shown, even with hosting on: see [Render screenshots inline](#render-screenshots-inline-in-pr-comments-opt-in).

### `host-images: branch` warned and fell back to labels

Four known causes. The first two fail the whole step; the last two skip one file and say which:

1. **Missing `contents: write` permission.** Add it to the workflow permissions block.
2. **Concurrent run race.** Two simultaneous workflows tried to push to the same `images-branch` and the second `updateRef` lost the race. There is no retry currently. Workaround: serialize PR runs with `concurrency: group: ${{ github.ref }}`, or use a per-workflow `images-branch`.
3. **`Skipping '…' — N MB exceeds the 10 MB hosting limit.`** The file stays in the HTML report.
4. **`Refusing to host '…' — it resolves outside the workspace.`** A reference escaped the checkout. This is deliberate: report content is not trusted input, and hosting publishes bytes to a branch.

### `Schema validation failed` from the formatter binary

Your raw-run JSON was produced by an older adapter than the formatter expects. Either upgrade your adapter, or pin `formatter-version` to a compatible version.

### Comment is showing partial markdown / "Report truncated"

GitHub caps comments at ~65 KB. The action truncates at the last newline before 55 KB and adds a "Report truncated" note. The full content is in the HTML artifact. If you see this routinely, consider splitting suites with [Multiple reports per PR](#multiple-reports-per-pr).

## FAQ

**Does this work on private repositories?**
Yes. No external services are involved — the action runs entirely inside GitHub Actions and uses only the repo's own `GITHUB_TOKEN`.

**Does this work for PRs from forks?**
The default `GITHUB_TOKEN` for fork PRs is read-only, so neither the comment nor the orphan-branch commit can be written. Common workarounds: run the comment step under `pull_request_target` (be aware of the [security implications](https://securitylab.github.com/research/github-actions-preventing-pwn-requests/)), or use a workflow that gates on `github.event.pull_request.head.repo.full_name == github.repository`.

**Does this run my tests?**
No. The action surfaces the output of a reporter that has already run. See [Prerequisites](#prerequisites).

**Can I customize the comment template?**
Not currently. The header is configurable via `comment-title`; the body is the markdown produced by the formatter. If you need richer customization, you can read the markdown via the `markdown-report-path` output and post your own comment with `actions/github-script`.

**What permissions does `GITHUB_TOKEN` need?**
At minimum `pull-requests: write`. Add `contents: write` only if using `host-images: branch`. The action does not require any classic-PAT or app-token configuration.

**Will the orphan `images-branch` grow without bound?**
Yes — there is no automatic cleanup yet. Old `pr-*/` directories are safe to delete manually at any time (they are referenced by historical PR comments, but the comments degrade gracefully to broken-image icons). A cleanup recipe / retention input may land in a future release.

**Where do I report bugs or request features?**
[github.com/jagreehal/executable-stories/issues](https://github.com/jagreehal/executable-stories/issues) — the action is developed in the monorepo.

## Supported frameworks

| Framework | Output type | Action config needed |
|---|---|---|
| Vitest | HTML + Markdown (via StoryReporter) | None |
| Jest | HTML + Markdown (via reporter) | None |
| Playwright | HTML + Markdown (via reporter) | None |
| Cypress | HTML + Markdown (via reporter) | None |
| pytest | Raw JSON | None |
| Go | Raw JSON | None |
| Rust | Raw JSON | None |
| Ruby (Minitest) | Raw JSON | None |
| JUnit 5 (Kotlin) | Raw JSON | None |
| xUnit (C#) | Raw JSON | None |
