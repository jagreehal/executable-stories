---
"executable-stories-formatters": minor
---

`review` writes `<output-name>.review.json` alongside the markdown and HTML: the machine
contract a CI surface renders from.

It carries the review's findings, ranked worst first, each with a severity, the file and
line it anchors to, the observations behind it, and a remedy:

- `failed` (blocker) — a scenario states a claim about the change and is red.
- `unasserted` (major) — a scenario passed without asserting anything, so it reads as
  proof while proving nothing.
- `uncovered` (major) — a changed file with no claim behind it.
- `skipped` (minor) — a scenario did not run, so its claim is unproven.
- `weak` (minor) — a changed file whose only claims are weakly evidenced.
- `policy` (blocker or minor) — an organisation release policy this commit does not
  satisfy. Decided by a control plane rather than by the run, so it is the one kind with
  no file to anchor to; `ReviewFinding.file` is optional for it.

Alongside the findings: the evidence bands, per-claim strength, and the run's outcome
counts. The GitHub Action builds its whole PR comment, its inline annotations and its job
summary from this one file.

`push` gains `--review-json <path>`, which writes the same contract for a pushed run: the
run URL, its outcome counts, and — with `--gate` — the organisation's verdict and its
blocking reasons. `ReviewJson.gate` records whether a gate reached a verdict, keeping
`not-evaluated` distinct from `clear` so a commit with no release recorded reads as
unchecked rather than approved. `ReviewJson.reportUrl` lets a surface link the run itself.
