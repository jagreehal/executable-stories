---
name: scenario-pr
description: >
  Write or update a pull request description that shows the UI change: before and after
  screenshots of every state the branch touches, taken with executable-stories-showcase, published to the PR,
  plus a short outline of the code's shape. Use for /scenario-pr, or when asked to describe a UI
  PR "with screenshots", "show the before and after", or "make the PR visual".
disable-model-invocation: true
---

# Describe a UI pull request with its real states

A reviewer of a UI change needs to see it. This skill finds the states the branch touches, shoots
them before and after, publishes the images, and writes a short PR body around them. Write as one
person to another: plain words, no jargon, nothing a screenshot already says.

For the images alone on every PR, without an agent, the GitHub Action
`jagreehal/executable-stories/actions/showcase-screenshots` posts them as a comment (see the
showcase README). This skill adds the written description around them.

The `executable-stories-showcase` skill is the reference for the library; its topic `verify` covers every
command used here. Read it first (`npx executable-stories-showcase guide verify`).

## 1. Find the PR and the base

```bash
gh pr view --json number,url,baseRefName,headRefName,title 2>/dev/null
```

No PR yet: check `git status --short --branch` and the branch's commits. Commit work that belongs
to the task, push the branch, and `gh pr create --draft --fill`. Ask the user only when the branch
holds no relevant work.

Done when: you have the PR number and its base branch.

## 2. Understand the change

Read the full diff (`gh pr diff`) and enough of the code around it to explain what changed and why.
Read the ticket or task notes if they are linked.

Done when: you can say in one sentence why the change exists.

## 3. Pick the states

```bash
npx executable-stories-showcase affected <dir> --base origin/<base> --src <app folders>
```

Treat the list as a starting point. Keep states the diff really changes; drop route or endpoint
matches the diff can't reach. When a shared file changed (layout, theme, global CSS), add the
main states of each feature, or all of them if there are few. Add loading, empty and error for
any feature the change touches. A change no scenario covers is worth saying in the PR; capturing
the state (topic `capture`) is better still.

Done when: you have the list of scenario names, each with a reason you could defend.

## 4. Shoot before and after

The dev server must be running (the project's scenario map skill, `scenarios-<app>`, says how).

1. Before: put the base's code in front of the dev server, e.g. `git switch --detach origin/<base>`
   with a clean tree (or a worktree of the base on another port). Shoot the listed states that
   exist on the base, with the same options you'll use after:
   `npx executable-stories-showcase shoot <dir> --base-url <url> --only <names> --out .shots/before`
2. After: switch back to the branch, let the dev server reload, then
   `npx executable-stories-showcase shoot <dir> --base-url <url> --only <names> --out .shots/after --compare .shots/before`

Look at every `.diff.png` and every `new` state. Tell the user about any diff the change didn't
intend before writing the PR. A scenario that fails (`✗`) needs fixing first; read its
`.md` page.

When the change is about an interaction (a flow, an animation, focus), record it too:
`npx executable-stories-showcase record <dir> --base-url <url> --steps <file> --only <name> --format gif --width 900`
(topic `media`). GitHub plays GIFs inline; it doesn't play linked MP4s.

Done when: `.shots/after` holds a diff for each changed state, a PNG for each new one, and you
have looked at all of them.

## 5. Publish the images

If the repository is public, the images will be public: check them for real names, emails, tokens
or internal URLs first, and ask the user before the first publish.

```bash
npx executable-stories-showcase publish .shots/after/*.diff.png <new states' PNGs> <GIFs> --folder pr-<number>
```

It pushes to the `scenario-shots` branch without touching the checkout and prints one Markdown
image line per file. Publishing the same folder again replaces it.

Done when: you have an image line for each picture the PR body will show.

## 6. Write and save the description

Read [references/pr-template.md](references/pr-template.md) and follow it. Save the body to
`.shots/pr-body.md`, then:

```bash
gh pr edit <number> --body-file .shots/pr-body.md
```

Done when: `gh pr view <number>` shows the new body with its images.

## 7. Report

Tell the user, in a few lines: the PR URL, the states shown (changed, new, unchanged), anything
that looked wrong in the screenshots, and states the change touches that have no scenario.

## Rules

- Show only states the change touches. Unchanged states go in one line, not in pictures.
- Never publish a screenshot you haven't looked at.
- Keep `.shots/` out of commits (add it to `.gitignore` if it isn't).
- Don't restate the diff in prose. The outline shows shape; the screenshots show the result.
