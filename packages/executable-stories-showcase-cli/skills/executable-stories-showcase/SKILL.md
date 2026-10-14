---
name: executable-stories-showcase
description: >
  Open any UI state of a web app from a URL with executable-stories-showcase: JSON scenarios that mock API
  responses, set URL params and store or cache state. Covers adding it to an app, writing and
  capturing scenarios, signed-in states, strict network mode, checking a UI change across every
  state with `shoot`, docs screenshots and videos with `record`, driving the app over the
  `executable-stories-showcase mcp` server, and fixing failures with `doctor` and error codes. Use when a
  project depends on executable-stories-showcase, when asked to show, test, demo, screenshot or record a
  loading, empty, error, signed-in or edge-case state, after changing UI code, or when a
  `?scenario=` link or `shoot` run fails.
---

# executable-stories-showcase: any UI state from a URL

A scenario is a JSON file describing one UI state: the route, the API responses (served by MSW in
the browser), URL params, and store or cache state. `startScenarios` runs before the app renders and
applies the scenario named in the URL. `?scenario=orders-empty` opens that state; nothing else in
the app changes.

```json
{
  "$schema": "../scenario.schema.json",
  "name": "orders-empty",
  "extends": "default",
  "path": "/orders",
  "network": [{ "method": "GET", "path": "/api/orders", "response": { "body": [] } }],
  "ready": "text=No orders yet"
}
```

## Reach a state with a link, not by clicking

Any browser tool can open a state directly: the `executable-stories-showcase mcp` server, Playwright,
agent-browser, Playwright MCP, or an AI testing agent. Use the link instead of clicking through the
app to reach a state:

```
http://localhost:5173/orders?scenario=orders-empty&scenario-strict
```

`npx executable-stories-showcase list <dir> --base-url <url> --json` prints every scenario with its link.
`&scenario-strict` answers any request the scenario didn't mock with a 501, so nothing reaches a
real backend. Once `<html data-scenario="orders-empty">` is set and the `ready` selector is
visible, the state is on screen.

## Show the real state, not a mock-up

When you explain a UI change or a design choice to a person, show the app: `shoot --only` the states
in question and put the PNGs (or `--compare` diffs) in front of them, instead of drawing the UI in
HTML or ASCII. Real screenshots show real data, real styles and real bugs. Describe in words only
what a screenshot can't show, such as the order things happen in.

## Topics

Read the topic for the job before you start. The files sit next to this one, and
`npx executable-stories-showcase guide <topic>` prints the same text from the installed package.

| Topic               | File                                                               | Read it when                                                                                         |
| ------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `setup`             | [references/setup.md](references/setup.md)                         | Adding executable-stories-showcase to an app: install, wiring before render, routers created on import, adapters |
| `writing-scenarios` | [references/writing-scenarios.md](references/writing-scenarios.md) | Writing or editing scenario JSON: fields, `extends`, sequences, loading states, rules                |
| `capture`           | [references/capture.md](references/capture.md)                     | Making a scenario from the running app: the panel, `?scenario-record`, MCP `save_scenario`           |
| `auth`              | [references/auth.md](references/auth.md)                           | Signed-in and signed-out states, cookies, apps that validate a token on startup                      |
| `network`           | [references/network.md](references/network.md)                     | Strict mode, `allow`, `ignore` for analytics, an existing MSW setup, named handlers                  |
| `verify`            | [references/verify.md](references/verify.md)                       | Checking a UI change: `affected`, `shoot`, before/after `--compare`, failure pages, `publish`        |
| `media`             | [references/media.md](references/media.md)                         | Screenshots and videos for docs and websites: viewports, dark mode, locales, `record`                |
| `mcp`               | [references/mcp.md](references/mcp.md)                             | Driving the live app from a coding agent: open, observe, act, check ready, save                      |
| `debugging`         | [references/debugging.md](references/debugging.md)                 | Something fails: `doctor`, error codes and exit codes, common causes                                 |

## Workflow

1. Look at what exists: `executable-stories-showcase` in `package.json`, the scenarios folder (often
   `src/scenarios/*.json`), and where `startScenarios` is called. Nothing there: follow `setup`.
2. If anything looks off, run `npx executable-stories-showcase doctor <dir> --base-url <url>` first. It checks
   the wiring one step at a time and prints the fix for each problem.
3. New state: capture it from the running app (topic `capture`) instead of writing fixtures by
   hand. Set a `ready` selector and check it matches.
4. Changed UI: `npx executable-stories-showcase affected <dir>` names the states your branch touches; shoot
   them with `--only`, and with `--compare` against a run from before the change (topic `verify`).
   Look at the screenshots. Each failed scenario gets `<out>/<name>.md` with the fix; read that
   page, not the JSON.
5. `npx executable-stories-showcase validate <dir>` before committing.

## Rules

- Every scenario gets a `ready` selector: text or a role that appears only once this state is on
  screen. Without it, tools screenshot whatever rendered first.
- Run in strict mode (`&scenario-strict`, the default for `shoot`, `openScenario` and MCP). A
  request that reaches a real backend makes the state depend on that backend.
- Prefer mocking the network over setting store state: a mocked response exercises the app's real
  fetching and error handling. Use `state` only for what no response can produce.
- Prefer capturing over hand-writing fixtures, and `extends: "default"` so a scenario holds only
  what differs.
- Never put real secrets or personal data in a scenario. Recording redacts secret-looking fields
  and re-issues JWTs unsigned, but check what it saved before committing.
- Don't edit recorded fixtures by hand to make a test pass; record again or fix the app.
- Keep `startScenarios` behind the app's development check so production bundles skip it.
- Run the CLI as `npx executable-stories-showcase ...` (or `pnpm exec executable-stories-showcase ...`).
