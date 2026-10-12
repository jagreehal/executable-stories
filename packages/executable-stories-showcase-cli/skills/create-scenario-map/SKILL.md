---
name: create-scenario-map
description: >
  Map every user-facing feature of an app that uses executable-stories-showcase to the UI states it can be in
  (loading, empty, error, signed out, edge cases), mark which have scenarios, capture the missing
  ones from the running app, and write it all as a project-local skill so later agents can show,
  check or screenshot any state. Use for /create-scenario-map, "which states are we missing",
  "map our UI states", or before relying on scenarios for QA or docs images.
disable-model-invocation: true
---

# Create a scenario map

A coding agent that changes UI should be able to open every state that change touches, by name,
without clicking through the app. This skill writes that map for one project as a skill,
`.agents/skills/scenarios-<app>/`, built on executable-stories-showcase, then captures the most important
missing states and proves the map once. Write it for the next agent, which reads it cold, mid-task.

The `executable-stories-showcase` skill is the reference for the library. Read it first and link to its topics
(`setup`, `capture`, `verify`, `mcp`, `debugging`) rather than restating them. It is
`.agents/skills/executable-stories-showcase/SKILL.md` once `npx executable-stories-showcase init` ran, and
`npx executable-stories-showcase guide <topic>` prints it from the installed package.

## 1. Learn the app from the repo, not the user

Ask the user only what the code can't tell you.

| Question           | Where the answer is                                                                                            | What it decides                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wiring             | `startScenarios` call, scenarios folder, `doctor`                                                              | Nothing wired: follow topic `setup` first. `doctor` must pass before you map anything                                                                |
| Run                | Dev command, port, env vars, seed data                                                                         | The launch line and `--base-url`                                                                                                                     |
| Features           | Routes, navigation, page components, docs                                                                      | One map row per user-facing feature                                                                                                                  |
| States             | Each feature's data fetching, conditionals, error boundaries, empty branches, permission checks, feature flags | The states per feature: loading, empty, populated, long content, error, partial failure, signed out, no permission, and the feature's own edge cases |
| Endpoints          | API clients, query hooks, existing MSW handlers and fixtures                                                   | Which `network` entries a state needs, and whether `handlers` can reuse test handlers                                                                |
| Auth               | How the app decides who is signed in                                                                           | The `signed-in` base scenario (topic `auth`)                                                                                                         |
| Existing scenarios | `npx executable-stories-showcase list <dir> --json`                                                                        | Which states are covered already                                                                                                                     |

## 2. Write the map

`.agents/skills/scenarios-<app>/SKILL.md`, with frontmatter (`name: scenarios-<app>`, a description
naming the app and when to use it), then:

| Section        | Holds                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Read first     | One line sending the reader to the `executable-stories-showcase` skill, and the scenarios folder           |
| Launch         | The exact dev command, port, env and seed data; the line that shows it's ready                 |
| Doctor         | `npx executable-stories-showcase doctor <dir> --base-url <url>`; run it first whenever something looks off |
| Open a state   | The link pattern and the MCP server; that links beat clicking through                          |
| Base scenarios | What `default` and `signed-in` (or the app's equivalents) contain, and which to extend         |
| Map            | A table: feature, route, state, scenario name, status (`covered`, `missing`, `can't mock`)     |
| Gotchas        | What reads as broken but isn't; third parties in `ignore`; states only the server can produce  |

For more than a handful of features, put one file per feature under `features/` with the same
columns and link them from the map.

Name scenarios `<feature>-<state>`, e.g. `orders-empty`, `orders-error`, `checkout-card-declined`.

## 3. Fill the most important gaps

Capture the missing states users hit most (empty and error for each main feature first), using
topic `capture`: over MCP, `open_app` or `open_scenario`, act until the state shows, `check_ready`,
`save_scenario` with `extends`. Mark each `covered` as you go. Leave the rest `missing`; the map is
the to-do list.

A state the browser can't produce (server-rendered data, a native permission prompt) is
`can't mock`, with one line on why.

## 4. Prove it before handing over

1. `doctor` passes.
2. `npx executable-stories-showcase validate <dir>` passes.
3. `npx executable-stories-showcase shoot <dir> --base-url <url> --only <the scenarios you added>` passes. Look
   at each screenshot: it must show the state the map says.
4. Open one state through the link pattern the map gives.

Fix what fails. A map that was never run is a draft.

## 5. Hand over

Tell the user: the skill path, features mapped, states covered and missing, the scenarios you added,
and the screenshot folder. Don't commit for them. When a feature gains a state, its map row changes
in the same commit as the scenario.

## Rules

- Write from what you observed. A section that could apply to any app isn't finished.
- No secrets or real personal data in scenarios or the map. Use fictional people.
- Link the `executable-stories-showcase` topics instead of repeating them.
