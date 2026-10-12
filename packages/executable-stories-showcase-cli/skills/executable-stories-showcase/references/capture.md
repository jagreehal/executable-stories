# Capturing scenarios from the running app

Capturing beats writing fixtures by hand: the responses are real, and the scenario matches what the
app actually renders.

## From a coding agent (MCP)

With the `executable-stories-showcase` MCP server registered (topic `mcp`):

1. `open_app { path: "/orders", record: true }`: requests reach the real backend and their JSON
   responses are recorded. Or `open_scenario { name: "default" }` to start from a scenario.
2. Drive the app into the state with `click`, `fill` and `press`; `observe` shows the page.
3. `check_ready { selector: "text=No orders yet" }` until it reports `match` and `visible`. Its
   `suggestions` list distinctive selectors on the page.
4. `save_scenario { name: "orders-empty", ready: "text=No orders yet", extends: "default" }` writes
   `<dir>/orders-empty.json` with only the differences from `default`, and reports problems.
5. `open_scenario { name: "orders-empty" }` replays it offline in strict mode. It should come back
   with `ok: true`.

## From the panel (people)

1. Open the app with `?scenario-record` and click through to the state.
2. Panel → **Save as scenario** → **Mark ready** and click distinctive UI (or pick a suggestion).
   The line under Ready says whether it matches.
3. Choose **Extends** (`default` when present) → **Save to src/scenarios** (Vite plugin or Next.js
   route), or **Download JSON**. **Copy link** shares a self-contained snapshot instead. Links open on localhost only, unless the app passes `startScenarios({ allowLinks: true })`.

## From code

`captureScenario(session, { name, ready, base })` returns `{ flat, forCatalog }`; write `forCatalog`
to the scenarios folder. `checkReadySelector` and `suggestReadySelectors` check and propose ready
selectors.

## What recording keeps and removes

The same redaction runs on captured store and cache state (`state`), whichever way it is saved.

- JSON responses only. Repeated calls to one endpoint become a `sequence` in call order.
- Secrets: values under secret-like keys (`password`, `secret`, `apiKey`, `token`, `sessionId`, …)
  become `"[redacted]"`, and signed JWTs are re-issued unsigned with the same claims, so the app
  still decodes them but no server accepts them. The browser console lists what was redacted.
  Redaction goes by key name, plus values that are credentials whatever their key (`Bearer …`,
  Stripe, GitHub, AWS and Slack keys); any other secret under an ordinary key is kept.
- Secret-looking query params (`api_key`, `token`, OAuth's `code`, `state`, `nonce`) are left out of the recorded `query`, so the
  entry matches whatever value the app sends, and out of a captured scenario's `url`.
- Personal data (names, emails, addresses) is kept. Record with a test account, or replace it
  before committing.
