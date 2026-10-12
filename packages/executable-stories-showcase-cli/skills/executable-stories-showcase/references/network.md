# Network: strict mode, third parties and existing MSW

## Strict mode

`?scenario-strict` (or `startScenarios({ strict: true })`) answers every request the scenario
doesn't cover with a 501, so nothing reaches a real backend. Page loads and assets (any path with a
file extension) pass. `shoot`, `openScenario` and the MCP server run strict by default.
`unhandledRequests(page)`, the panel and `shoot` list what wasn't covered.

## Requests that should pass or be silenced

```ts
import { type ScenarioInput, startScenarios } from 'executable-stories-showcase';

declare const scenarios: ScenarioInput[];

await startScenarios({
  scenarios,
  allow: ['images.example-cdn.com'], // reaches the real network, even in strict mode
  ignore: [/posthog|segment|sentry|google-analytics|googletagmanager|recaptcha|hcaptcha|intercom/i],
});
```

- `allow`: requests the screen needs from the real network, such as CDN images or a maps API.
- `ignore`: analytics, error reporting, captcha and chat SDKs. Never reported as unhandled; in strict
  mode they get an empty 204 instead of a 501, so most SDKs stay quiet and don't retry.
- An SDK that still logs errors (some expect a JSON body): don't start it in scenarios,
  `if (!currentSession()?.active) analytics.init(...)`.

Patterns are URL substrings or regular expressions. Match the hosts the app actually calls.

## Apps that already use MSW

Start your worker and pass it in. Scenario entries answer first, then your handlers, then the strict
catch-all; `destroy()` restores your handlers.

```ts
await worker.start();
await startScenarios({ scenarios, worker });
```

## Reusing handlers from tests

Pass handlers by name, then name them in scenarios. They answer after the scenario's `network`.

```ts
import { type ScenarioInput, startScenarios } from 'executable-stories-showcase';
import { statementsEmpty } from './test/handlers'; // the handlers your unit tests use

const scenarios: ScenarioInput[] = [
  { name: 'no-statements', handlers: ['statementsEmpty'], ready: 'text=No statements yet' },
];

await startScenarios({ scenarios, handlers: { statementsEmpty } });
```

```json
{
  "name": "no-statements",
  "extends": "signed-in",
  "handlers": ["statementsEmpty"],
  "ready": "text=No statements yet"
}
```

An unknown name fails when the scenario opens and lists the known ones. `validate` can't see
handlers, so it only checks the JSON.
