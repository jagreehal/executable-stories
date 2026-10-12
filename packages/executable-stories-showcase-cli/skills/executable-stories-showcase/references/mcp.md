# Driving the app over MCP

`executable-stories-showcase mcp <dir> --base-url <url>` serves the running app to a coding agent over MCP
(stdio). `init` registers it in `.mcp.json` (Claude Code) and `.cursor/mcp.json` (Cursor). By hand:

```bash
claude mcp add executable-stories-showcase -- npx executable-stories-showcase mcp src/scenarios --base-url http://localhost:5173
codex mcp add executable-stories-showcase -- npx executable-stories-showcase mcp src/scenarios --base-url http://localhost:5173
```

The dev server must already be running. Each agent's client starts its own server, and each server
has its own headless browser page. Browser flags (`--viewport`, `--locale`, `--timezone`,
`--color-scheme`) apply.

## Tools

| Tool                     | Does                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `list_scenarios`         | Every scenario with description, ready selector and link                                                                        |
| `validate`               | Problems in the catalog; empty means valid                                                                                      |
| `open_scenario`          | Opens a scenario in strict mode, waits for ready; returns codes, unmocked requests, errors and a screenshot                     |
| `open_app`               | Opens a path without a scenario; `record: true` records real responses for `save_scenario`                                      |
| `observe`                | The page as an accessibility tree, plus URL, active scenario, unmocked requests and errors                                      |
| `screenshot`             | PNG of the page or of one element                                                                                               |
| `click`, `fill`, `press` | Act on the page; selectors are Playwright selectors (`text=Save`, `role=button[name="Save"]`, CSS)                              |
| `check_ready`            | Whether a selector matches and is visible now, plus selectors that would work                                                   |
| `save_scenario`          | Saves the current state as `<dir>/<name>.json`, `extends` writing only differences; refuses to overwrite unless `replace: true` |

Failed calls return `isError` with a code in brackets, e.g. `[UNKNOWN_SCENARIO]`.

## Loops

Check a change: `list_scenarios`, then `open_scenario` for each affected state; read the codes and
look at the screenshot.

Add a state: `open_app` (with `record: true`) or `open_scenario`, act until the state shows,
`check_ready`, `save_scenario`, then `open_scenario` on the new name to prove it replays offline.

The panel is hidden in MCP sessions; agents read the page through `observe`.
