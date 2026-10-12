import { diffScenario } from './catalog.js';
import { PARAM, RECORD_PARAM, STRICT_PARAM } from './link.js';
import { redactSecrets, withoutSecretParams } from './redact.js';
import type { ScenarioSession } from './runtime.js';
import { parseScenario, type Scenario, type ScenarioInput } from './schema.js';

const SCENARIO_PARAMS = new Set([PARAM, STRICT_PARAM, RECORD_PARAM]);

export interface CaptureOptions {
  name: string;
  description?: string;
  /** Playwright selector that marks this UI state ready. */
  ready?: string;
  /**
   * Catalog scenario to `extends`. Diff uses its resolved (flattened) form.
   * Omit for a full self-contained snapshot.
   */
  base?: Scenario;
  /** Relative `$schema` path stamped on the catalog file only, e.g. `../scenario.schema.json`. */
  schemaPath?: string;
}

export interface CapturedScenario {
  /** Flattened snapshot for inline share links. */
  flat: Scenario;
  /** File to commit: diffs against `base` when set, otherwise the flat snapshot as input. */
  forCatalog: ScenarioInput;
}

/**
 * Snapshot what the app shows now: current route and URL params, the active network
 * fixtures (plus recorded responses), and every connected adapter's live state.
 */
export function captureScenario(session: ScenarioSession, options: CaptureOptions): CapturedScenario {
  const params: Record<string, string> = {};
  new URLSearchParams(location.search).forEach((v, k) => {
    if (!SCENARIO_PARAMS.has(k)) params[k] = v;
  });
  // A page URL can carry a token or a magic-link code; it is saved like recorded traffic.
  const url = withoutSecretParams(params, 'the captured URL');

  const state = Object.fromEntries(
    session.keys().flatMap((key) => {
      const live = session.read(key);
      if (live === undefined) return [];

      // A store or cache can hold a session token; captured scenarios get committed and shared,
      // so they get the same redaction as recorded responses.
      const { value, redacted } = redactSecrets(live);

      if (redacted.length) {
        console.info(`[executable-stories-showcase] redacted ${redacted.join(', ')} in state["${key}"]`);
      }

      return [[key, value] as const];
    }),
  );

  // Recorded responses go after the scenario's own: they answered requests it didn't mock.
  const network = [...(session.resolved?.network ?? []), ...session.recorded()];

  const draft = parseScenario({
    name: options.name,
    description: options.description || undefined,
    path: location.pathname,
    url,
    network: network.length ? network : undefined,
    handlers: session.resolved?.handlers,
    viewport: session.resolved?.viewport,
    state,
    ready: options.ready || undefined,
  });

  const flat = session.catalog.resolve(draft);
  const flatBase = options.base ? session.catalog.resolve(options.base) : undefined;
  const forCatalog = diffScenario(flat, flatBase);

  if (options.schemaPath) forCatalog.$schema = options.schemaPath;

  return { flat, forCatalog };
}
