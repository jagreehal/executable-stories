# Setup

## Install and init

```bash
npm i executable-stories-showcase zod msw          # msw only when scenarios mock the network
npm i -D executable-stories-showcase-cli @playwright/test
npm i executable-stories-showcase-react            # useScenarioState, for component state (React, Preact)

npx executable-stories-showcase init src/scenarios
```

`init` writes `src/scenarios/default.json` and `src/scenario.schema.json`, prints a wiring snippet,
installs these skills into `.agents/skills/` (and `.claude/skills/`), and registers the MCP server
in `.mcp.json`. It never edits your source files. `--no-skills` skips the skills and the MCP server.

Vite: serve the MSW worker and let the panel save into the project.

```ts
// vite.config.ts
import { msw } from 'msw/vite';
import { executableStoriesShowcase } from 'executable-stories-showcase/vite';

export default { plugins: [msw({ mode: 'worker-only' }), executableStoriesShowcase({ dir: 'src/scenarios' })] };
```

Without the MSW Vite plugin: `npx msw init public`.

## Wire the runtime before render

```ts
import { type ScenarioInput, startScenarios } from 'executable-stories-showcase';
import { mountPanel } from 'executable-stories-showcase/panel';

if (import.meta.env.DEV) {
  const session = await startScenarios({
    scenarios: Object.values(
      import.meta.glob<ScenarioInput>('/src/scenarios/*.json', { eager: true, import: 'default' }),
    ),
    adapters: [], // see below
    refresh: () => queryClient.resetQueries(), // when scenarios mock the network
  });
  mountPanel(session, { schemaPath: '../scenario.schema.json' });
}
// then create the router and render
```

- `await` it before rendering. The first fetches must already hit the scenario's mocks.
- Routers read the URL once, when they're created. If a module creates the router as soon as it
  is imported (`export const router = createBrowserRouter(...)`), a static import runs before the
  session. Import it after:

  ```ts
  // main.ts: start the session first, then import the router
  import type { ScenarioInput } from 'executable-stories-showcase';

  if (import.meta.env.DEV) {
    const { startScenarios } = await import('executable-stories-showcase');
    await startScenarios({
      scenarios: Object.values(
        import.meta.glob<ScenarioInput>('/src/scenarios/*.json', { eager: true, import: 'default' }),
      ),
    });
  }

  const { router } = await import('./routing/router'); // created now, with the scenario's URL
  ```

- Next.js (App Router): start it from a `'use client'` wrapper in the root layout and render
  children once it resolves. The package README has the component and the save route.
- Apps that already run MSW: start your worker and pass it as `worker`. See topic `network`.

## Connect app state

Mock the network first. Add adapters for state no response can produce, such as a panel left open
or cached data during a refetch.

| State lives in | Connect with                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| TanStack Query | `tanstackQuery(queryClient)` from `executable-stories-showcase/tanstack-query`                                           |
| Zustand        | `zustandAdapter(store, { schema: StoreSchema.partial() })` from `executable-stories-showcase/zustand`                    |
| Redux          | `withScenarioState(rootReducer, StateSchema)`, then `reduxAdapter(store)`                                    |
| XState         | `xstateAdapter(machine, { context: ContextSchema })`, then `createActor(machine, { snapshot: xs.snapshot })` |
| Cookies        | `cookiesAdapter()` from `executable-stories-showcase/cookies`                                                            |
| A component    | `useScenarioState('page', state, (s) => dispatch({ type: 'set', state: s }), Schema)`                        |

Pass a Zod schema wherever an adapter accepts one: invalid scenario state is then rejected before
anything changes. `scenarioJsonSchema({ state: { key: Schema } })` regenerates the editor schema
with typed `state`.

## Check

`npx executable-stories-showcase doctor src/scenarios --base-url http://localhost:5173` passes. Opening
`/?scenario=default` sets `<html data-scenario="default">`.
