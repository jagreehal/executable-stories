import type { z } from 'zod';
import type { TypedAdapter } from '../runtime.js';
import { parseJson, type Serializable } from '../schema.js';

interface Store<T> {
  setState(partial: Partial<T>): void;
  getState(): T;
  subscribe(listener: () => void): () => void;
}

/**
 * Connects a Zustand store as `state.zustand` (or your key). The schema decodes scenario
 * JSON into the slice of state to merge, e.g. `StoreSchema.partial()`.
 */
export const zustandAdapter = <T extends Serializable>(
  store: Store<T>,
  { key = 'zustand', schema }: { key?: string; schema: z.ZodType<Partial<T>>; },
): TypedAdapter<Partial<T>> => ({
  key,
  schema,
  apply: (state) => store.setState(state),
  read: () => parseJson(JSON.stringify(store.getState())),
  subscribe: (onChange) => store.subscribe(onChange),
});
