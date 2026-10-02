# executable-stories-e2e

Living documentation from [e2e](https://www.npmjs.com/package/e2e) runs. A reporter turns e2e's `report-1` document into the RawRun JSON every executable-stories adapter writes, so `executable-stories format` renders it like any other suite.

```bash
npm i -D executable-stories-e2e executable-stories-formatters
```

```ts
// e2e.config.ts
import { web } from '@e2e-dev/web';
import type { E2EConfig } from 'e2e';
import { storyReporter } from 'executable-stories-e2e';

export default {
  targets: [{ engine: web(), app: { url: 'http://localhost:3000' } }],
  reporters: ['list', storyReporter()],
} satisfies E2EConfig;
```

```bash
npx e2e run
npx executable-stories format --format html,markdown   # reads .executable-stories/raw-run.json
```

Option: `storyReporter({ rawRunPath })` writes somewhere else, relative to the project root.

## How a run maps

| e2e                                                    | executable-stories                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| result (test × target)                                 | scenario; describes give the suite path                                 |
| `app`, `session`, `resource` step                      | Given                                                                   |
| `agent.act` and other agent steps, `locator`, `screen` | When                                                                    |
| `assertion` step, `agent.assert`                       | Then, `assertions: 1` when it reached a verdict                         |
| repeated Given/When/Then                               | And                                                                     |
| step text                                              | marker text, the agent instruction, or a phrased locator or expect step |
| `passed` / `flaky` / `failed` / `skipped`              | pass / pass with the retry counted / fail / skip                        |
| `timed-out` / `interrupted`                            | timeout / interrupted                                                   |
| step `blocked`, `timed-out` / `cancelled`              | fail / skip, with e2e's error code in the message                       |
| attempt screenshot, video, trace, download, log        | attachment on the step that produced it                                 |
| hosted video (`url`, no file)                          | video doc                                                               |
| error `details.expected` / `observed`                  | expected / actual on the failure                                        |
| test tags                                              | story tags                                                              |
| agent step `explanation`                               | `Agent:` note under the step                                            |

The report shows the final attempt. Unselected results stay out. A `--last-failed` or tag-filtered run is marked `runScope: "filtered"`, so it keeps the scenarios it did not run.

An `e2e explore` run, or a run that reached no test, leaves the last `raw-run.json` in place. The `bug-bash` skill turns explore findings into scenarios.

## Name steps in your own words

Without markers, step text comes from what e2e records: the agent's instruction, or a locator or `expect` step phrased as `click the "Increment" button`. Markers name a group of steps:

```ts
import { expect, test } from 'e2e';
import { story } from 'executable-stories-e2e';

test('pressing Increment twice reads 2', async ({ app, screen }) => {
  story.given('the counter page is open');
  await app.open('/');
  story.when('the user presses Increment twice');
  await screen.getByRole('button', { name: 'Increment' }).click();
  await screen.getByRole('button', { name: 'Increment' }).click();
  story.then('the count reads 2');
  await expect(screen.getByRole('status')).toHaveText('2');
});
```

Each marker renders as a step with the e2e steps that ran after it listed beneath. It takes the worst status of those steps and counts their recorded claims as assertions.

A marker appends its call site and time to `.executable-stories/e2e-markers/<pid>.jsonl`. The reporter matches markers to results by test file, line range and attempt time, then deletes the folder. Call markers in the test body, before the steps they describe.
