import { SAVE_ENDPOINT } from './link.js';
import { redactSecrets, withoutSecretParams } from './redact.js';
import { type Json, MethodSchema, type NetworkEntry, parseJson } from './schema.js';

/** One real response, placed by when its request started. */
export interface RecordedCall {
  /** Request start order: responses can arrive in any order. */
  order: number;
  method: NetworkEntry['method'];
  path: string;
  query: Record<string, string>;
  status: number;
  body?: Json;
}

/**
 * Records responses that reached the real network, from MSW's lifecycle events. Only JSON is
 * kept: pages, scripts and other assets aren't app state.
 */
export function createRecorder() {
  const started = new Map<string, number>();
  const calls: RecordedCall[] = [];
  const pending = new Set<Promise<void>>();
  let next = 0;

  return {
    start(requestId: string) {
      started.set(requestId, next++);
    },
    /** A mocked response: nothing to record. */
    drop(requestId: string) {
      started.delete(requestId);
    },
    bypass(requestId: string, request: Request, response: Response): Promise<void> {
      const order = started.get(requestId) ?? next++;
      started.delete(requestId);
      const method = MethodSchema.safeParse(request.method);
      // The panel's own save calls aren't part of the app's traffic.
      const own = new URL(request.url).pathname.startsWith(SAVE_ENDPOINT);

      if (own || !method.success || !response.headers.get('content-type')?.includes('json')) {
        return Promise.resolve();
      }

      const url = new URL(request.url);

      // Scenario queries hold one value per key.
      if (new Set(url.searchParams.keys()).size < [...url.searchParams.keys()].length) {
        console.warn(`[executable-stories-showcase] not recorded: ${request.method} ${url} repeats a query key`);

        return Promise.resolve();
      }

      const read = response.clone().text().then((text) => {
        const call: RecordedCall = {
          order,
          method: method.data,
          path: url.origin === location.origin ? url.pathname : url.origin + url.pathname,
          query: withoutSecretParams(Object.fromEntries(url.searchParams), `${method.data} ${url.pathname}`),
          status: response.status,
        };

        // Parsed before the push, so a body that fails to parse leaves no half-recorded call.
        if (text) {
          // Recorded scenarios get committed, linked and pasted into chats: keep secrets out.
          const { value, redacted } = redactSecrets(parseJson(text));
          call.body = value;

          if (redacted.length) {
            console.info(`[executable-stories-showcase] redacted ${redacted.join(', ')} in ${method.data} ${call.path}`);
          }
        }

        calls.push(call);
      }).catch((err) => console.warn('[executable-stories-showcase] skipped a recorded response', err))
        .finally(() => pending.delete(read));

      pending.add(read);

      return read;
    },
    /** Responses whose bodies have been read, as network entries. */
    entries: () => toNetwork(calls),
    /** Wait for bodies still being read. */
    settled: async () => {
      await Promise.all(pending);
    },
  };
}

/**
 * Recorded calls as scenario network entries: repeated calls to one endpoint become a
 * `sequence` in request order, or a single `response` when every call answered the same.
 */
export function toNetwork(calls: RecordedCall[]): NetworkEntry[] {
  const groups = new Map<string, RecordedCall[]>();

  for (const call of calls.toSorted((a, b) => a.order - b.order)) {
    // Sorted, because replay matches query params in any order.
    const query = Object.fromEntries(Object.entries(call.query).toSorted(([a], [b]) => a.localeCompare(b)));
    const key = JSON.stringify([call.method, call.path, query]);
    groups.set(key, [...(groups.get(key) ?? []), { ...call, query }]);
  }

  return [...groups.values()]
    .map(([first, ...rest]) => {
      const responses = [first, ...rest].map(({ status, body }) => ({ status, body }));
      const same = responses.every((r) => JSON.stringify(r) === JSON.stringify(responses[0]));
      const entry: NetworkEntry = { method: first.method, path: first.path };

      if (Object.keys(first.query).length) entry.query = first.query;

      if (same) entry.response = responses[0];
      else entry.sequence = responses;

      return entry;
    })
    // An entry without `query` matches any query string: try the more specific entries first.
    .toSorted((a, b) => Object.keys(b.query ?? {}).length - Object.keys(a.query ?? {}).length);
}
