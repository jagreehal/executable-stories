---
title: e2e reporter and markers
description: executable-stories-e2e turns runs of the e2e test runner into story docs, with optional step markers.
---

[e2e](https://www.npmjs.com/package/e2e) by TesterArmy runs web and mobile tests that mix agent steps (`agent.act`, `agent.assert`) with locators and assertions. `executable-stories-e2e` adds a reporter that writes each finished run as RawRun JSON, so `executable-stories format` renders it like any other suite.

## Install and configure

```bash
npm i -D executable-stories-e2e executable-stories-formatters
```

```ts
// e2e.config.ts
import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { storyReporter } from 'executable-stories-e2e';

export default {
  targets: [{ engine: web(), app: { url: 'http://localhost:3000' } }],
  reporters: ['list', storyReporter()],
} satisfies E2EConfig;
```

```bash
npx e2e run
npx executable-stories format --format html,markdown
```

| Option | Default | Meaning |
| --- | --- | --- |
| `rawRunPath` | `.executable-stories/raw-run.json` | Where to write the RawRun JSON, relative to the project root |

The reporter works with the web engine (`@e2e-dev/web`) and the mobile engine (`@e2e-dev/mobile`).

## How a run renders

| e2e | Story |
| --- | --- |
| Test result | Scenario; describes give the suite path, tags carry over |
| `app`, `session`, `resource` step | Given, e.g. `open /` |
| `agent.act` and other agent steps | When, with the instruction as text |
| Locator action | When, e.g. `click the "Pay" button` |
| `expect` on a locator, `agent.assert` | Then, one observed assertion each |
| Repeated Given, When or Then | And |
| Agent explanation | `Agent:` note under the step |
| Screenshot, video, Playwright trace | Attachment on the step that produced it |
| Failed assertion | Expected and actual values from e2e |
| Retries | The final attempt, with earlier attempts counted |
| Blocked or timed-out step | Fail, with e2e's error code in the message |

An `e2e explore` run, or a run that reached no test, leaves the last `raw-run.json` in place.

## Markers

Markers name a group of steps in your own words:

```ts
import { test, expect } from 'e2e';
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

The report shows each marker as a step, with the e2e steps that ran after it listed beneath:

```
Given the counter page is open
    open /
When the user presses Increment twice
    click the "Increment" button
    click the "Increment" button
Then the count reads 2
    the status shows the expected text
```

`story` exposes `given`, `when`, `then`, `and` and `but`. Call markers in the test body, before the steps they describe; the reporter matches them by test file, line and attempt time. A marker takes the worst status of its steps and counts their recorded claims as assertions.
