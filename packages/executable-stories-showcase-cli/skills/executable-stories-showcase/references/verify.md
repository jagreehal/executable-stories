# Verify a UI change across every state

Start the dev server, then:

```bash
npx executable-stories-showcase shoot src/scenarios --base-url http://localhost:5173 --out .scenario-shots
```

For each scenario `shoot` opens the link in strict mode, waits for `ready`, saves `<name>.png`, and
checks for unmocked requests, uncaught exceptions and `console.error` calls. `--only a,b` limits
the run; `--json` prints the report for scripts.

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

Look at the PNGs for the states the change touches, plus loading, empty and error. Attach the
relevant ones to the PR. Pages for passing scenarios are deleted on each run, so the `.md` files
in the output folder are always the current failures.

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
