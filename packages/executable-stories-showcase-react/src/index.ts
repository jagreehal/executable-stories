import { useEffect, useRef } from 'react';
import { type Adapter, type Connection, currentSession, type Json, type Serializable } from 'executable-stories-showcase';
import type { z } from 'zod';

type Binding<T> = [apply: (state: T) => void, schema: z.ZodType<T>] | [apply: (state: Json) => void];

/**
 * Connect component-owned state (useState, useReducer, useMachine) to scenarios.
 * The active scenario's `state[key]` is applied on mount, the panel shows `state`
 * live, and edits from the panel arrive through `apply`. A no-op without a session.
 * Works with Preact via preact/compat.
 *
 * With a schema, `apply` receives decoded, typed state.
 */
export function useScenarioState<T extends Serializable>(
  key: string,
  state: T,
  apply: (state: T) => void,
  schema: z.ZodType<T>,
): void;
/** Without a schema, `apply` receives the scenario's JSON as it is. */
export function useScenarioState(key: string, state: Serializable, apply: (state: Json) => void): void;
export function useScenarioState<T extends Serializable>(key: string, state: T, ...binding: Binding<T>) {
  // Always call the latest `apply`, without reconnecting on every render.
  const latest = useRef(binding);
  latest.current = binding;
  const connection = useRef<Connection<T> | undefined>(undefined);

  useEffect(() => {
    const [, schema] = binding;

    const adapter: Adapter<T> = schema
      ? {
        key,
        schema,
        apply: (decoded) => {
          const current = latest.current;

          if (current.length === 2) current[0](decoded);
        },
      }
      : {
        key,
        apply: (json) => {
          const current = latest.current;

          if (current.length === 1) current[0](json);
        },
      };

    const c = currentSession()?.connect(adapter);
    connection.current = c;

    return () => c?.disconnect();
    // Reconnect only when the key changes; `latest` carries the current callbacks.
  }, [key]);

  useEffect(() => {
    connection.current?.update(state);
  }, [key, state]);
}
