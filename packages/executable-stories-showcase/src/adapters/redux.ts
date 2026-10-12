import type { z } from 'zod';
import { deepMerge } from '../catalog.js';
import type { JsonAdapter } from '../runtime.js';
import { type Json, parseJson, type Serializable } from '../schema.js';

export const SCENARIO_HYDRATE = '@@scenarios/hydrate';

interface Action {
  type: string;
  payload?: Json;
}

/**
 * Wrap your root reducer so scenario state can be merged in. Objects deep-merge into the
 * current state and `null` removes a key; `schema` checks the result is still valid state.
 */
export function withScenarioState<S extends Serializable, A extends Action>(
  reducer: (state: S | undefined, action: A) => S,
  schema: z.ZodType<S>,
) {
  return (state: S | undefined, action: A): S => {
    if (action.type !== SCENARIO_HYDRATE || action.payload === undefined) return reducer(state, action);
    // Reducers return their initial state for an action they don't handle.
    const base = state ?? reducer(undefined, action);

    return schema.parse(deepMerge(parseJson(JSON.stringify(base)), action.payload));
  };
}

interface Store {
  dispatch(action: Action): void;
  getState(): Serializable;
  subscribe(listener: () => void): () => void;
}

/** Connects a Redux store as `state.redux` (or your key). Needs `withScenarioState`. */
export const reduxAdapter = (store: Store, { key = 'redux' }: { key?: string; } = {}): JsonAdapter => ({
  key,
  apply: (payload) => store.dispatch({ type: SCENARIO_HYDRATE, payload }),
  read: () => parseJson(JSON.stringify(store.getState())),
  subscribe: (onChange) => store.subscribe(onChange),
});
