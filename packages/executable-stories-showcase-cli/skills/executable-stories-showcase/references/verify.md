# Verify a UI change across every state

Start the dev server, then:

```bash
npx executable-stories-showcase shoot src/scenarios --base-url http://localhost:5173 --out .scenario-shots
```

For each scenario `shoot` opens the link in strict mode, waits for `ready`, saves `<name>.png`, and
checks for unmocked requests, uncaught exceptions and `console.error` calls. `--only a,b` limits
the run; `--json` prints the report for scripts.

## Which states a change touches

```bash
npx executable-stories-showcase affected src/scenarios --base main --src src
```

It lists each scenario the branch can affect (committed, uncommitted and new files) and why:

| Reason     | Means                                                              |
| ---------- | ------------------------------------------------------------------ |
| `scenario` | The scenario's file changed                                        |
| `extends`  | It extends a scenario that changed                                 |
| `map`      | A scenario map row's Source column covers a changed file           |
| `endpoint` | A changed file mentions an endpoint the scenario mocks             |
| `route`    | A changed file sits under a folder named like the scenario's route |

The last line is `--only a,b,c`, ready for `shoot`. Changed files nothing pointed at are listed
too: a shared file (layout, theme, global CSS) can change every state, so shoot them all then.
`--src` limits it to the app's folders in a monorepo; `--json` is for scripts. A scenario map with
Source columns (`/create-scenario-map`) makes the result much sharper than the endpoint and route
guesses.

## Before and after

Shoot the base branch first, then the change, and compare:

```bash
git stash                      # or check out the base branch in a worktree on another port
npx executable-stories-showcase shoot src/scenarios --base-url http://localhost:5173 --only <affected> --out .shots/before
git stash pop
npx executable-stories-showcase shoot src/scenarios --base-url http://localhost:5173 --only <affected> --out .shots/after --compare .shots/before
```

Each state that changed gets `.shots/after/<name>.diff.png`: before, after and the changed pixels
in red, side by side. States are reported `changed`, `same` or `new` (no earlier shot), and ones
that are gone as `removed`. A diff doesn't fail the run: in a UI change, diffs are the point. Look
at every `changed` state and ask whether the change meant to touch it.

Shoot both runs with the same viewport and options, and with the dev server warm, or fonts and
images still loading show as changes.

## When a scenario fails

The terminal names a page for it: `❯ details .scenario-shots/<name>.md`. Read that page. It has:

- the codes (`READY_TIMEOUT`, `UNMOCKED_REQUEST`, `SESSION_NOT_STARTED`, `SCENARIO_NOT_IN_APP`, `PAGE_ERROR`,
  `CONSOLE_ERROR`, `ELEMENT_NOT_FOUND`) and the link that reopens the state;
- for a ready timeout, whether the selector matched anything, plus distinctive selectors on the
  page now;
- for unmocked requests, `network` entries ready to paste (fill in real bodies, or record them);
- uncaught exceptions and console errors.

Look at the screenshot before changing the scenario: a ready timeout can mean the selector is
wrong, or that the UI change broke the state. Fix the app when the screenshot shows a bug.

## Evidence

Look at the PNGs for the states the change touches, plus loading, empty and error. Pages for
passing scenarios are deleted on each run, so the `.md` files in the output folder are always the
current failures.

To show them in a PR, publish them; `gh` can't upload images:

```bash
npx executable-stories-showcase publish .shots/after/*.diff.png --folder pr-42
```

It commits the files to a `scenario-shots` branch with git plumbing (the checkout, index and
current branch stay as they are), pushes it, and prints a Markdown image line per file, linked to
that commit so the links don't change. Paste those lines into the PR body. `--branch` and
`--remote` change where they go. The `scenario-pr` skill writes the whole PR description this way.

## In Playwright tests

```ts
import { openScenario, unhandledRequests } from 'executable-stories-showcase/playwright';

await openScenario(page, 'orders-empty');
expect(await unhandledRequests(page)).toEqual([]);
```

## Missing states

Ask which states lack scenarios: loading, empty, error, partial data, long content, permissions,
signed out. Capture them (topic `capture`). `npx executable-stories-showcase suggest` asks a model to list
candidate states from the source and drafts them into `proposed/`; treat drafts as ideas, then
`promote` the reviewed ones.
