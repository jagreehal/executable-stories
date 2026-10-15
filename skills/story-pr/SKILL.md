---
name: story-pr
description: Use when writing or updating the description of a pull request in a repo that uses executable-stories ("write the PR", "describe this PR", "update the PR body"). Writes a short reviewer-first description whose behaviour section comes from the behavioural diff between the base and head runs, whose claims cite the scenarios that prove them, and whose UI changes show the run's own screenshots, instead of a summary of the code diff.
---

# Story PR

A PR description written from the code diff tells the reviewer what was typed. They can
read the diff for that. What they cannot read off the diff is what the system now does
differently, and whether anything checked it. This repo runs the system and keeps the
answer, so the description takes it from there.

Keep it short. The reviewer reads this before the diff, and every line they skip is a
line that hid the one they needed.

## Agent guardrails

- **Only claim behaviour a scenario proves.** Every behaviour line cites a scenario that
  ran on the head commit. A change with no scenario behind it is written as "not covered
  by a scenario", in the notes, where the reviewer will see it.
- **Report what disappeared.** A scenario in the base run and missing from the head run is
  the line a reviewer most needs. Never drop it to keep the description tidy.
- **Status travels with the claim.** A failing or skipped scenario is not a shipped
  behaviour.
- **Do not push or create the PR without asking.** Updating the body of an existing PR is
  what the user asked for; publishing a branch is a separate decision.

## 1. Find the PR

```bash
gh pr view --json number,url,title,baseRefName,headRefName,body 2>/dev/null
```

No PR: show the user the branch and its commits, and ask before pushing and running
`gh pr create`. An existing body may hold things a person wrote, such as links or a
checklist. Keep those.

## 2. Get the two runs

The behaviour section needs a run of the base and a run of the head.

- **Head:** run the suite on the PR branch. `reports/raw-run.json`.
- **Base:** prefer the run CI already keeps for the base branch (an uploaded artifact, or
  the cloud). Otherwise run the suite on the merge base:

```bash
git worktree add /tmp/pr-base "$(git merge-base origin/<base> HEAD)"
(cd /tmp/pr-base && <install> && <test command>)
cp /tmp/pr-base/reports/raw-run.json /tmp/base-run.json
git worktree remove /tmp/pr-base
```

Check the base run before you trust it. Each of these makes the changelog wrong without
looking wrong:

- **No usable base run** (the install, the suite or the worktree failed): stop and say so.
  Diffing against nothing lists every scenario as New behavior, which hides the change.
- **Scenarios failing on the base:** list them first
  (`executable-stories list /tmp/base-run.json --list-format json | jq 'map(select(.status == "failed")) | map(.scenario)'`).
  Against a broken base, a scenario reads as Fixed or Changed for reasons that aren't this
  PR's. Mention them in "Things to note", and don't claim this PR fixed them unless the
  diff did.
- **Shared code changed** (a layout, a theme, a utility many features call): compare the
  whole suite, never a filtered run. A filtered run only shows what you thought it would touch.

Then diff them:

```bash
executable-stories compare /tmp/base-run.json reports/raw-run.json \
  --format changelog --output-dir /tmp/pr --output-name pr
```

`/tmp/pr/pr.changelog.md` lists the scenarios that appeared, changed and disappeared, and
the status flips. Pass `--partial` if either run was filtered or sharded, or every scenario
it skipped reads as removed.

Evidence for each changed file, when the reviewer needs it:

```bash
git diff --name-status origin/<base>...HEAD > /tmp/pr/changed.txt
executable-stories review reports/raw-run.json --changed-files /tmp/pr/changed.txt \
  --output-dir /tmp/pr --output-name review
```

`/tmp/pr/review.review.json` bands each changed file: changed code no scenario covers comes
first. That band belongs in "Things to note". `spec-evidence-review` explains the bands.

## 3. Write it

Use [references/template.md](references/template.md). Its rules:

- **Why:** one sentence. The problem, and what works after this merges.
- **Things to note:** 1 to 3 bullets: changed code no scenario covers, scenarios that
  disappeared, migrations, deliberate omissions. "None." when there are none.
- **Behaviour:** from the changelog, keeping its groups (New behavior, Fixed, Broken,
  Removed, Renamed or moved, Changed) and adding a few words on what differs. Broken and
  Removed go first. Leave the section out when no scenario changed, and say so in one line.
- **How it's built:** the smallest code-shape view that explains the change, as
  `show-me` would draw it: a short file tree, a call tree, a type, or pseudocode. Use a
  `diff` block for a change to an existing shape, and a plain block for a new one. One or
  two views, not a tour.
- **Screens:** when a scenario that changed has a `story.screenshot()` or a showcase
  recording, link the image or clip from the head run. Do not take new screenshots of
  behaviour the run already captured: the run's copy is the one that was checked. For a UI
  change in an app that uses showcase, show the states before and after:
  `executable-stories-showcase affected` names the states the branch touches, and
  `shoot --only <them> --compare <base shots>` writes a before | after | changed image for each
  one that differs. The `scenario-pr` skill in the showcase CLI walks through it.

Write plainly, as one person to another. No headings for sections you left empty.

## 4. Publish

```bash
gh pr edit <number> --body-file /tmp/pr/body.md
```

Images only render on GitHub once uploaded. `executable-stories-showcase publish <files>
--folder pr-<number>` pushes them to a `scenario-shots` branch and prints a Markdown image line
per file; it works with any `gh` and in CI. Without showcase, `format --attach-images` prints
the `gh pr comment --attach` command (GitHub CLI 2.99+); `show-me` covers the details. Look at
every image before you publish it, and if the repo is public, check it for real names, emails
and tokens first.

Then tell the user the PR URL, and anything in "Things to note" they may want to fix
before a reviewer sees it.

## Relationship to neighbouring skills

- `explain-change` is the long form: an explainer published with the docs, with a quiz.
  Use it when the change needs teaching, not just reviewing.
- `release-notes` is the same behavioural diff across a release instead of one PR.
- `spec-evidence-review` covers authoring claims so `review` has evidence to grade.
- `story-control-loop` writes the same kind of body automatically, for the loop's PRs.
