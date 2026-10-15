---
name: scenario-coverage-loop
description: >
  Set up a scheduled coding-agent loop that closes a project's scenario coverage gap a few states
  at a time: `executable-stories-showcase coverage` measures the gap from the scenario map, a small script picks
  the next states, an agent captures them and opens one PR, and a PR check keeps coverage from
  slipping. Use for /scenario-coverage-loop, or when asked to automate filling missing scenarios.
disable-model-invocation: true
---

# Scenario coverage loop

The scenario map (`/create-scenario-map`) lists every UI state and whether it has a scenario. This
skill builds a loop that drives the `missing` count to zero in small, reviewable PRs, run on a
schedule. Think of it as a control loop:

| Part       | Here                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| Set point  | Every state that can be mocked has a scenario that passes `shoot`                                        |
| Sensor     | `npx executable-stories-showcase coverage <dir> --json`                                                  |
| Controller | `scripts/scenario-coverage-next.mjs`: picks the next few missing states                                  |
| Actuator   | A coding agent with the `executable-stories-showcase` and `scenarios-<app>` skills, handing over a patch |
| Gate       | The workflow's `verify` job: the agent's patch stays in scope and every state renders                    |
| Dampener   | A PR check: `validate`, `coverage` and `shoot` on every PR                                               |
| Memory     | `.github/agent-memory/scenario-coverage.md`: standing feedback from reviewers                            |

Disturbances are everyone else's changes: new features add `missing` rows, refactors break
scenarios. The dampener stops the second; the loop absorbs the first.

## 1. Check the ground

Read before asking anything:

- The map: `.agents/skills/scenarios-*`. Run `npx executable-stories-showcase coverage <dir>`. No map, or it
  exits 1: run `/create-scenario-map` first.
- How the app runs: the map's Launch section (dev command, port, env, seed data). The loop runs it
  in CI, so it must start without secrets the runner lacks.
- CI: `.github/workflows/*`, package manager, install command, Node version.
- Validation the repo already runs: lint, typecheck, test.

Done when: `coverage` exits 0 locally, and you know the dev command and the install command.

## 2. Agree the design with the user

Propose defaults from what you read; ask only about these:

1. **Scope.** Which features the loop may add states for (default: all rows in the map).
2. **Batch.** States per PR (default 3). Small enough to review in five minutes.
3. **Order.** Default: empty and error states first, then map order. A different priority (by
   traffic, by feature) goes in the controller.
4. **Agent.** Claude Code (default), Codex or another headless CLI, and its secret.
5. **Cadence.** Weekly (default) or daily, with at most one open loop PR at a time.
6. **Dampener.** Default on: the PR check in step 3. Ask whether a failing `shoot` should block
   merges or only report.

Write the agreed design in a few lines and show the user before building.

Done when: the user has agreed the design.

## 3. Build the parts

Copy and adapt the files in `references/`, keeping the names and paths unless the repo has a
convention for them:

| From                                                   | To                                           |
| ------------------------------------------------------ | -------------------------------------------- |
| [references/controller.mjs](references/controller.mjs) | `scripts/scenario-coverage-next.mjs`         |
| [references/memory.md](references/memory.md)           | `.github/agent-memory/scenario-coverage.md`  |
| [references/prompt.md](references/prompt.md)           | `.github/agent-prompts/scenario-coverage.md` |
| [references/workflow.yml](references/workflow.yml)     | `.github/workflows/scenario-coverage.yml`    |
| [references/pr-check.yml](references/pr-check.yml)     | `.github/workflows/scenarios.yml` (dampener) |

Fill in every `<placeholder>`: scenarios folder, base URL, dev command, install command, batch
size. Put scope and order in the controller, not the prompt, so they're testable.

Done when: every `<placeholder>` from the reference files is replaced. The prompt keeps `$SELECTED` and
`$MEMORY`; the workflow fills them in.

## 4. Run each part by hand

1. Sensor: `npx executable-stories-showcase coverage <dir> --json > /tmp/coverage.json`.
2. Controller: `node scripts/scenario-coverage-next.mjs /tmp/coverage.json 3`. Check it picks the
   states you'd pick.
3. Actuator: with the dev server running, run the agent headless with the prompt and the
   controller's output, on a scratch branch. Check it adds the scenarios, flips their rows to
   `covered`, and passes `validate`, `coverage` and `shoot --only <new>`.

Fix what's off before going near CI: the workflow only orchestrates these three.

Done when: one local run produced a branch you'd approve.

## 5. Dry-run in CI

A workflow can't be dispatched until it exists on the default branch. Either merge it with
`workflow_dispatch` only, or add a temporary `push` trigger for the current branch, watch one run,
and remove it. Review the PR it opens like any other.

Done when: the workflow ran in CI and opened a PR you reviewed.

## 6. Hand over

Tell the user: the files added, the design, the coverage line now, how to steer it (edit the memory
file; mark a row `can't mock` with a reason to stop the loop picking it), and how to speed it up once
the PRs are consistently good (bigger batch, daily cadence).

## Rules

- One open loop PR at a time. A loop that outruns review piles up conflicts.
- The agent marks a state `can't mock` (with one line on why) rather than faking it with store state
  that the real app could never reach.
- Standing feedback goes in the memory file, not in the prompt: the prompt is the job, the memory
  is what reviewers taught it.
- Treat the agent's job as untrusted. It gets a read-only token and an explicit tool list, and hands
  over a patch. The tool list narrows what it does but isn't a sandbox: it can write files, and
  CLI flags such as `--rules` load JavaScript, so assume it can run code and read its own job's
  environment (the agent's API key is there anyway). Never give that job secrets beyond the agent's. A separate `verify` job on a fresh runner refuses any patch that touches more than
  scenario JSON and map Markdown, then checks it with the default branch's own install and code, so
  nothing the agent wrote can run there or fake a result. Only `open-pr`, which runs nothing but git
  and gh, can write. Keep that split when adapting the workflow; widen the tool list only for a
  command the agent provably needs.
- Never let the loop edit app code. It adds scenarios and map rows only; a state that needs an app
  change is reported in the PR.
