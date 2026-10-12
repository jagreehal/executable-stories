# Debugging

Start with doctor. It is read-only: it opens one scenario and writes nothing.

```bash
npx executable-stories-showcase doctor src/scenarios --base-url http://localhost:5173
```

It checks, in order: the scenarios parse and resolve; ffmpeg; the skills and MCP server are
installed; the dev server answers; `/mockServiceWorker.js` is served when scenarios mock the
network; Chromium starts; a scenario becomes active and shows its ready selector; the panel can
save into the project. Each problem prints its code and fix. `--json` for scripts.

## Exit codes

| Exit | Class  | Meaning                                                                      |
| ---: | ------ | ---------------------------------------------------------------------------- |
|    0 |        | Everything passed                                                            |
|    1 | failed | A scenario ran and failed, or validation found problems                      |
|    2 | config | Bad arguments, invalid or unknown scenarios                                  |
|    3 | infra  | Something needed is missing or down: dev server, browser, ffmpeg, MSW worker |

## Error codes

| Code                  | Exit | Cause                                                                | Fix                                                                                                                             |
| --------------------- | ---: | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `SESSION_NOT_STARTED` |    1 | `<html data-scenario>` never named the scenario                      | `startScenarios` must run and be awaited before render, outside production-only code; import routers created on import after it |
| `SCENARIO_NOT_IN_APP` |    1 | The session runs, but the app's catalog has no scenario by that name | Add the file to the folder or list the app loads; reload or restart the dev server for new files                                |
| `READY_TIMEOUT`       |    1 | The ready selector never became visible                              | Read `<out>/<name>.md` and the screenshot: fix the selector or the app                                                          |
| `UNMOCKED_REQUEST`    |    1 | The scenario didn't cover a request                                  | Add the pasted `network` entries, `extends` a scenario that has them, or `ignore` third-party SDKs                              |
| `PAGE_ERROR`          |    1 | Uncaught exception while rendering                                   | Fix the app, or the fixture that crashes it                                                                                     |
| `CONSOLE_ERROR`       |    1 | `console.error` during render                                        | Same; browser "Failed to load resource" logs are not counted                                                                    |
| `ELEMENT_NOT_FOUND`   |    1 | `--element` matched nothing visible                                  | Check the selector                                                                                                              |
| `STEPS_FAILED`        |    1 | A `record` step threw                                                | Fix the step; selectors must match the scenario's UI                                                                            |
| `INVALID_ARGUMENT`    |    2 | A flag or argument is wrong                                          | The message says which                                                                                                          |
| `INVALID_SCENARIO`    |    2 | A scenario file doesn't parse or resolve                             | `validate` lists them                                                                                                           |
| `UNKNOWN_SCENARIO`    |    2 | A name isn't in the catalog                                          | The message lists known names                                                                                                   |
| `DEV_SERVER_DOWN`     |    3 | Nothing answers at `--base-url`                                      | Start the dev server, or pass the URL it prints                                                                                 |
| `BROWSER_MISSING`     |    3 | Playwright or Chromium isn't installed                               | `npm i -D @playwright/test && npx playwright install chromium`                                                                  |
| `FFMPEG_MISSING`      |    3 | `record` needs ffmpeg                                                | Install it, or set `FFMPEG_PATH`                                                                                                |
| `WORKER_NOT_SERVED`   |    3 | `/mockServiceWorker.js` 404s                                         | `msw({ mode: 'worker-only' })` in Vite, or `npx msw init public`                                                                |

## Common causes

- A scenario works in the panel but not from a link: the app reads the URL before
  `startScenarios` finishes. Await it before render.
- A state flickers to real data: the scenario misses a request, so it went to the backend. Use
  strict mode and read the unmocked list.
- Switching scenarios reloads the page: expected when URL params differ, state can't be un-applied,
  or scenarios mock the network without `refresh`.
- A path with a file extension (`/api/data.json`) passes as an asset in strict mode; mock it
  explicitly.
