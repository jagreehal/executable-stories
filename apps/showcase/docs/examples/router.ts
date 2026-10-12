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
