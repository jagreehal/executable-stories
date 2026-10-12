# executable-stories-showcase-react

Connect component-owned state (`useState`, `useReducer`, `useMachine`) to [executable-stories-showcase](https://www.npmjs.com/package/executable-stories-showcase). Preact works through `preact/compat`.

```ts
import { useScenarioState } from 'executable-stories-showcase-react';

const [state, dispatch] = useReducer(reducer, initial);
useScenarioState('page', state, (page) => dispatch({ type: 'set', state: page }), PageStateSchema);
```

On mount the hook applies the active scenario's `state.page`. The panel shows `state` live, and your edits in the panel go back through `dispatch`. With a Zod schema, `apply` receives typed state; without one, it receives the scenario's JSON.
