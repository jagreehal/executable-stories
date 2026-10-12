import type { QueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import type { TypedAdapter } from '../runtime.js';
import { JsonSchema, parseJson } from '../schema.js';

export const tanstackQueryState = z.array(
  z.object({
    queryKey: z.array(JsonSchema).min(1),
    data: JsonSchema,
    /** Refetch on mount (e.g. to show a background refresh). Default: fresh, so the data stays as given. */
    stale: z.boolean().optional(),
  }),
);

type CacheState = z.output<typeof tanstackQueryState>;

/**
 * Connects the TanStack Query cache as `state["tanstack-query"]`:
 * [{ "queryKey": ["countries"], "data": [...] }]
 * Seeds states the network alone can't produce (cached data while a refetch hangs),
 * and lets the panel inspect, edit and capture the live cache.
 */
export const tanstackQuery = (client: QueryClient): TypedAdapter<CacheState> => ({
  key: 'tanstack-query',
  schema: tanstackQueryState,
  async apply(entries) {
    for (const { queryKey, data, stale } of entries) {
      // A refetch started by a scenario switch must not land on top of fresh scenario data.
      if (!stale) await client.cancelQueries({ queryKey, exact: true });
      client.setQueryData(queryKey, data);

      // Fresh by default, so a saved scenario reproduces the screen instead of refetching over it.
      if (stale) void client.invalidateQueries({ queryKey, exact: true, refetchType: 'none' });
      else client.setQueryDefaults(queryKey, { staleTime: Infinity });
    }
  },
  read: () =>
    parseJson(JSON.stringify(
      client.getQueryCache().getAll().flatMap((query) =>
        query.state.data === undefined ? [] : [{
          queryKey: query.queryKey,
          data: query.state.data,
          // A refresh in flight is part of what's on screen ("Refreshing…"), so capture it.
          stale: query.state.fetchStatus === 'fetching' || undefined,
        }]
      ),
    )),
  subscribe: (onChange) => client.getQueryCache().subscribe(onChange),
});
