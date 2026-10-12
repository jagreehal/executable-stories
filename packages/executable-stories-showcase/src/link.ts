import type { Scenario } from './schema.js';

declare global {
  /** Requests the active scenario didn't cover, for tests and agents (see `unhandledRequests`). */
  var executableStoriesShowcaseUnhandled: string[] | undefined;
}

export const PARAM = 'scenario';

/** Fail unmatched requests instead of letting them reach the network. */
export const STRICT_PARAM = 'scenario-strict';

/** Record real responses so they can be saved as a scenario. */
export const RECORD_PARAM = 'scenario-record';

/** Dev-server route the `executable-stories-showcase/vite` plugin serves for the panel's "Save to project". */
export const SAVE_ENDPOINT = '/__executable-stories-showcase/save';

export const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);

/**
 * Whether a save URL the app's save route hands the panel is a loopback save server, such as
 * the one the Next.js route starts on 127.0.0.1. The panel posts captured state there, so a
 * URL on any other host is refused.
 */
export const isLoopbackSaveUrl = (value: string): boolean => {
  try {
    const url = new URL(value);

    return url.protocol === 'http:' && LOOPBACK.has(url.hostname) && url.pathname === SAVE_ENDPOINT;
  } catch {
    return false;
  }
};

/** Inline scenario JSON, kept in the URL hash so it never reaches a server. */
export const DATA_KEY = 'scenario-data';

/**
 * A shareable URL that opens the app in a resolved scenario.
 * `inline` embeds the flattened scenario, so the link works without the catalog.
 */
export function scenarioHref(
  resolved: Scenario,
  { base = location.href, inline = false, strict = false, record = false } = {},
): string {
  const url = new URL(base);
  url.search = '';
  url.hash = '';

  if (resolved.path) url.pathname = resolved.path;

  for (const [k, v] of Object.entries(resolved.url ?? {})) {
    if (v !== null) url.searchParams.set(k, v);
  }

  if (inline) {
    const { $schema: _schema, extends: _extends, ...snapshot } = resolved;
    url.hash = new URLSearchParams({ [DATA_KEY]: JSON.stringify(snapshot) }).toString();
  } else {
    url.searchParams.set(PARAM, resolved.name);
  }

  if (strict) url.searchParams.set(STRICT_PARAM, '');

  if (record) url.searchParams.set(RECORD_PARAM, '');

  return url.toString();
}

/** Inline scenario JSON from a URL hash, if present. */
export const readInline = (hash: string) => new URLSearchParams(hash.slice(1)).get(DATA_KEY);
