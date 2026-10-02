---
name: e2e-story-api
description: >
  Use when a project runs end-to-end tests with the e2e runner by TesterArmy
  and wants executable-stories docs from them: adding storyReporter() to
  e2e.config.ts, naming steps with story.given/when/then markers, or reading
  how agent, locator and expect steps render.
metadata:
  type: core
  library: executable-stories-e2e
  library_version: "0.0.0"
  sources:
    - "jagreehal/executable-stories:packages/executable-stories-e2e/src/index.ts"
    - "jagreehal/executable-stories:packages/executable-stories-e2e/src/story.ts"
    - "jagreehal/executable-stories:packages/executable-stories-e2e/src/phrase.ts"
---

# e2e: Story API

e2e runs its own tests. `executable-stories-e2e` adds a reporter that turns each finished run into the RawRun JSON every adapter writes, and `executable-stories format` renders it.

## Setup

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

The reporter writes `.executable-stories/raw-run.json`. Pass `storyReporter({ rawRunPath })` to write elsewhere. The mobile engine (`@e2e-dev/mobile`) works the same way.

## Step text without markers

Every e2e step becomes a story step:

| e2e step | Keyword | Text |
| --- | --- | --- |
| `app.open('/')`, session, resource | Given | `open /` |
| `agent.act('add the shoes to the cart')` | When | the instruction |
| `locator.click`, `tap`, `fill` | When | `click the "Pay" button` |
| `expect(...).toBeVisible()` | Then | `the "Pro" heading is visible` |
| `agent.assert('the receipt is shown')` | Then | the instruction |

A repeated Given, When or Then renders as And. Locators with filters, regexes or `nth()` keep the recorded text.

## Markers

Markers name a group of steps in your words:

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

Each marker renders as a step with the e2e steps that ran after it listed beneath. It takes the worst status of those steps and counts their recorded claims as assertions.

- Exports: `story.given`, `story.when`, `story.then`, `story.and`, `story.but`. There is no `story.init`.
- Call a marker in the test body, before the steps it describes. The reporter matches markers by test file, line and attempt time.
- A marker and its step can share a line: `story.then('the count reads 2'); await expect(...)`.

## What else carries over

- Describes become the suite path; test tags become story tags.
- Agent steps add the agent's explanation as an `Agent:` note.
- Screenshots, videos and Playwright traces attach to the step that produced them.
- Failed assertions keep e2e's expected and observed values.
- Retries show the final attempt and count the earlier ones.
- An `e2e explore` run, or a run that reached no test, leaves the last `raw-run.json` in place. Use the `bug-bash` skill to turn explore findings into scenarios.
