---
name: stories-verify-skill
description: Use when a repo that uses executable-stories also runs an agent workflow that looks for a project-local `verify-<app>` skill (pstack's `/poteto-mode`, `/create-verification-skill`, `/setup-pstack`, or any harness asking "how do I prove this works?"). Wraps the story suite as that skill and generates its feature map from the run.
---

# Stories Verify Skill

Agent workflows such as pstack prove a change through a project-local `verify-<app>` skill:
Launch, Doctor, Drive, Evidence, Cleanup, Helpers, and a feature map under `features/`.

Your story suite already drives the app, and each run records what every scenario checked.
`executable-stories list --list-format feature-map` prints the map in the shape those
skills read, straight from the tests. This skill writes a thin `verify-<app>` wrapper over
the suite. Keep one harness: the suite.

## 1. Read the repo

Answer these from the code. Ask the user only for what you cannot see.

- **Test command.** The script that runs the story suite (`pnpm test`, `npx playwright test`,
  `go test ./...`), and how to filter it to one file and one scenario title.
- **Reporter.** Where the raw run and `by-file/` state land. With no reporter configured,
  load the reporter-setup skill for the framework first.
- **App under test.** Whether the stories need a running app (Playwright, Cypress, e2e), plus
  its start command and ready signal. A unit-level suite needs only an install.
- **Agent home.** `.claude/skills/` for Claude Code, `.cursor/skills/` for Cursor. Use the
  one the repo already has. If it has both, write once and symlink the other.

## 2. Write `verify-<app>/SKILL.md`

Frontmatter: `name: verify-<app>` and a description naming the app, the surface, and "prove
a change works". Then these sections, with the repo's real commands:

- **Launch.** Install, then start the app if the stories need one, with its ready signal.
- **Doctor.** One read-only check: the app answers on its port, and
  `executable-stories runs status` shows per-file state from this checkout.
- **Drive.** Run the scenario that covers the change: the test command filtered to its file
  and title. Give an uncovered change a scenario first, with `story-tdd`, or
  `bug-to-scenario` for a defect. Proof from the suite stays in the repo for the next agent.
- **Evidence.** Compare a baseline run with a treatment run. Keep the red run from the repro,
  or run the scenario on the merge base. Run it again on the change, then
  `executable-stories compare <baseline-raw-run> <treatment-raw-run> --format markdown`.
  Cite the scenario and its `kind` in the diff. Read its `assertion` state from the treatment
  run with `executable-stories list <treatment-raw-run> --list-format json`, since
  `reports/by-file/` updates only when you format a run. Paste the failing-then-passing
  output verbatim. Screenshots and videos come from `story.screenshot()` and the Playwright
  recordings attached to the scenario.
- **Verdict.** Name the surface, then give one verdict in the words pstack's ledger and
  `verify-this` use:

  | The run shows                                                                                                                                                    | Verdict                                                                                                                     |
  | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
  | `fixed` (red in the baseline, green now) in a browser suite (`.story.spec.ts`, `.story.cy.ts`, e2e) against the real app                                         | `VERIFIED`, `live-ui-verified`                                                                                              |
  | The same in a unit or integration suite (`.story.test.ts`, Go, pytest and the rest)                                                                              | `VERIFIED`, `unit-test-verified`. A unit scenario proves branch behaviour. Say so when the report came from a live surface. |
  | Still failing, or `regressed`                                                                                                                                    | `NOT VERIFIED`, `verifier-failed`                                                                                           |
  | `unasserted`, `skipped` or pending; `added` and passing with no red run behind it; a `gitSha` other than the head commit; the file missing from a `filtered` run | `INCONCLUSIVE`, `verifier-blocked`                                                                                          |

  The second word goes in the orchestrate ledger:
  `orch ledger record <pr> <gitSha> <verdict> --evidence <compare-output>`.
  `verifier-blocked` counts as unproven. Verify again once the scenario asserts, has a red
  run, or runs at the head commit. A `verifier-failed` row needs a fix.

  Each verdict belongs to one commit. Check `jq -r .gitSha <raw-run>` against
  `git rev-parse HEAD` before you cite a run. Uncommitted edits share HEAD's SHA, so for work
  in progress the run must also postdate your last edit.

- **Arrange.** Open named app states (empty, error, signed out) with
  `executable-stories-showcase` fixtures. Fixtures set the precondition. The scenario's own
  steps produce the symptom.
- **Cleanup.** Stop the processes Launch started. Keep `reports/`.
- **Helpers.** `features/regenerate.sh`, below, executable, with its invocation shown.

## 3. Generate the feature map

Write `features/regenerate.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cd "$(git -C "$here" rev-parse --show-toplevel)"
# Folds the latest raw run into reports/by-file/ so the map reads current state.
npx executable-stories format reports/raw-run.json --format story-report-json \
  --output-dir reports --output-name index
npx executable-stories list reports/by-file --list-format feature-map > "$here/README.md"
```

Swap `reports/raw-run.json` for the raw run path from step 1. Run the script after a full
suite run and commit the result. Each story file becomes one feature with four sections:
Sub-features (scenarios), How to get to it (Given and When steps), Driving it (the file to
run and the Then steps that prove it), and Gotchas (failing, pending and unasserted
scenarios, plus `story.note()` text). Tell readers of the verify skill that the map is
generated: they fix an entry in the suite and run the script again.

## 4. Prove it once

Follow the generated skill end to end: Launch, Doctor, Drive one scenario, format the
evidence, Cleanup. Confirm `reports/` still holds the run afterwards.

## Composing with pstack

pstack runs the workflow and the suite supplies the proof. Map its steps to these pieces:

| pstack asks for                                 | Use                                                                                                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/create-verification-skill`                    | This skill. Its "existing harnesses first" rule points here.                                                                             |
| `control-ui`, `control-cli`                     | Exploring and a first repro. Their rule is "reuse the repo's harness first", so land the repro as a scenario before the fix.             |
| `verify-this`                                   | Evidence and Verdict above: two runs as baseline and treatment, `compare` as the diff.                                                   |
| An orchestrate ledger row                       | The Verdict row, keyed by the run's `gitSha`.                                                                                            |
| `/maintain-verification-skill`                  | Keep running it. `features/regenerate.sh` becomes its index step, and its source review, unmapped-feature search and live pass carry on. |
| A repro before a fix (bug-fix playbook, `/tdd`) | `bug-to-scenario`. The failing scenario is the repro.                                                                                    |
| Prove it works (`principle-prove-it-works`)     | The scenario's status and `assertion` state in the run.                                                                                  |
| A PR body with proof (opening-a-pr playbook)    | `story-pr`. Its `## Verification` bullets each name a scenario, its surface, and its verdict.                                            |
| A Benny control adapter                         | The adapter's proof backend. See below.                                                                                                  |

### Benny's control adapter

pstack's Benny repro automation drives the app through a control adapter with a fixed
contract. The suite supplies the proof backend: the scenario as the scripted repro, the run
as evidence, `compare` as before and after, and `verify-<app>/features/README.md` as the
feature map. The adapter provides the rest:

- **Bring up** a named revision and return a session id, how it confirmed the app and
  environment, and stable app markers.
- **Drive UI** through real user actions for the exploratory repro, reporting each action
  and the state change it caused.
- **Reset** the feature between Benny's two independent repro attempts.
- **Inspect** state read-only, to cross-check what the scenario saw.
- **Screenshot and record** with metadata: path, capture time, app marker, and the window or
  region captured.
- **Cleanup** that reports what it stopped, removed, kept, or left for a person.
- **The nine-step setup check** from the contract, passing before Benny's repro automation
  starts.

Without pstack the skill works the same: any agent asking how to prove a change reads the
same sections.

**Reply:** the path of the verify skill, the command that regenerated its map, and the
scenario you drove to prove it, with its surface and verdict.
