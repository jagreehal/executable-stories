# Agent guidance: executable-stories-playwright

Story API and `StoryReporter` for Playwright Test. This package reports on tests;
it does not launch browsers. `story.init(testInfo)` reads `testInfo` and nothing
else, and the only place it touches `page` is `story.screenshot({ page })`.

That separation is deliberate. Browser selection, channels, flags and executable
paths belong in the consumer's `playwright.config.ts`. Do not add launch options,
channel helpers or binary resolution to this package: it would make the adapter
feel less like Playwright, which the root `AGENTS.md` rules out.

## Testing against a real Chrome

Playwright's bundled Chromium carries no flagged or origin-trial features, so any
suite that exercises one (WebMCP's `document.modelContext`, say) needs a real
Chrome binary. That is entirely config — the story API is unchanged.

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.conformance.ts',
  use: {
    launchOptions: {
      executablePath: process.env.CHROME_BIN,
      args: ['--enable-experimental-web-platform-features'],
    },
  },
});
```

Prefer `channel: 'chrome'` (or `chrome-beta`, `chrome-dev`, `chrome-canary`) when
any installed Chrome will do — Playwright finds it, so there is no env var and no
absolute path to keep working across machines:

```ts
use: { channel: 'chrome-canary', launchOptions: { args: [...] } },
```

Reach for `executablePath` only when you must pin one specific build.

**Fail loudly when the browser is missing.** With `executablePath: undefined`,
Playwright silently falls back to bundled Chromium, and the run then fails as a
missing *API* rather than a missing *browser* — a confusing hour. Resolve the
path eagerly and throw:

```ts
// e2e/chrome.ts
const requireChrome = (): string => {
  const path = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    .find((p): p is string => !!p && existsSync(p));
  if (!path) throw new Error('No Chrome for the native lane. Set CHROME_BIN.');
  return path;
};
```

Assert the version too, in a test rather than a comment, so the floor is a claim
the report carries:

```ts
story.then(`the major version is at least ${MINIMUM_CHROME}`);
expect(version).toBeGreaterThanOrEqual(MINIMUM_CHROME);
```

## Keep it a separate lane

Do not make every test depend on a browser most machines do not have. Run two
projects, or two configs:

| Lane        | Browser            | Runs        | Proves                             |
| ----------- | ------------------ | ----------- | ---------------------------------- |
| default     | bundled Chromium   | every PR    | your code, against a polyfill/fake |
| conformance | real Chrome, flags | on demand   | the fake still matches the browser  |

The conformance lane is what keeps a hand-written test double honest. When it
fails, the double is wrong, not the browser.

## Record the measurement, not just the assertion

A conformance test that only asserts leaves no trace of what the browser actually
did, so a failure says "changed" without saying *to what*. Attach the measured
value:

```ts
const tool = await page.evaluate(() => /* ...read the real API... */);
story.json({ label: 'RegisteredTool shape', value: tool });

story.then('inputSchema comes back as a JSON string, not the object the draft types');
expect(typeof tool.inputSchema).toBe('string');
```

The report then documents the browser's behaviour rather than merely testing it,
which is the whole point of putting a conformance lane in this format.

Set a real title while you are there — the default is "User Stories":

```ts
[reporterPath, { formats: ['markdown'], markdown: { title: 'Chrome Conformance' } }]
```

## Under an agent sandbox

Real Chrome is still Chromium, so it hits the Mach port failure described in the
root `AGENTS.md` under "Chromium under an agent sandbox". `ES_CHROMIUM_SINGLE_PROCESS=1`
covers the suites in this repo; a consumer's own config needs the same
`--single-process` opt-in, and video recording and mobile emulation stay
unavailable because they need a second process.

## Parallel runs

`fullyParallel: true` is fine. Scenario order in the report comes from
`sourceLine`, not from the order tests finished, so a report does not reorder
itself when you add a worker.
