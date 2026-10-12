# executable-stories-showcase

Put a running app into any state from a URL. Scenarios are JSON files that set network fixtures, URL params and app state. A dev panel lets you switch between them, inspect and edit live state, and save it as a shareable link. Playwright helpers open scenarios in tests, and adapters connect TanStack Query, Zustand, Redux and XState.

```ts
import { type ScenarioInput, startScenarios } from 'executable-stories-showcase';
import { mountPanel } from 'executable-stories-showcase/panel';

const session = await startScenarios({
  scenarios: Object.values(
    import.meta.glob<ScenarioInput>('./scenarios/*.json', { eager: true, import: 'default' }),
  ),
  defaultScenario: 'default',
});
mountPanel(session);
```

Documentation: https://github.com/jagreehal/executable-stories
