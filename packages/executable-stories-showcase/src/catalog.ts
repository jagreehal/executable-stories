import {
  type Json,
  type JsonObject,
  type NetworkEntry,
  parseScenario,
  type Scenario,
  type ScenarioInput,
} from './schema.js';

/**
 * A business rule a resolved scenario must satisfy, beyond schema shape.
 * Return a message (or several) for each violation.
 */
export type ScenarioRule = (scenario: Scenario) => string | string[] | void | undefined;

/** Identity helper for typing rule lists. */
export const defineScenarioRules = (rules: ScenarioRule[]) => rules;

export interface Catalog {
  list: Scenario[];
  get(name: string): Scenario | undefined;
  /** Flatten `extends` into one self-contained scenario, then check the rules. */
  resolve(scenario: Scenario): Scenario;
  /** Resolve every scenario; returns one message per problem. */
  check(): string[];
}

export function createCatalog(
  raw: ScenarioInput[],
  { rules = [] }: { rules?: ScenarioRule[]; } = {},
): Catalog {
  const byName = new Map<string, Scenario>();

  for (const [i, data] of raw.entries()) {
    const s = parseScenario(data, `#${i}`);

    // Commas join names in ?scenario=a,b, so a catalog name can't contain one.
    if (s.name.includes(',')) throw new Error(`Scenario name "${s.name}" can't contain a comma`);

    if (byName.has(s.name)) throw new Error(`Duplicate scenario name "${s.name}"`);
    byName.set(s.name, s);
  }

  const flatten = (s: Scenario, seen: string[]): Scenario => {
    if (seen.includes(s.name)) {
      throw new Error(`Circular extends: ${[...seen, s.name].join(' -> ')}`);
    }

    const parents = [s.extends ?? []].flat().map((name) => {
      const parent = byName.get(name);

      if (!parent) throw new Error(`Scenario "${s.name}" extends unknown "${name}"`);

      return flatten(parent, [...seen, s.name]);
    });

    const { extends: _extends, $schema: _schema, ...own } = s;

    // Start from an empty base so standalone scenarios are normalised too (remove entries, nulls).
    return [...parents, own].reduce(merge, { name: own.name });
  };

  const resolve = (s: Scenario) => {
    const flat = flatten(s, []);
    const violations = rules.flatMap((rule) => rule(flat) ?? []);

    if (violations.length) {
      throw new Error(`Scenario "${s.name}" breaks rules:\n${violations.map((m) => `- ${m}`).join('\n')}`);
    }

    return flat;
  };

  return {
    list: [...byName.values()],
    get: (name) => byName.get(name),
    resolve,
    check: () =>
      [...byName.values()].flatMap((s) => {
        try {
          resolve(s);

          return [];
        } catch (err) {
          return [err instanceof Error ? err.message : String(err)];
        }
      }),
  };
}

const byKey = ([a]: [string, unknown], [b]: [string, unknown]) => a.localeCompare(b);

const routeKey = (e: NetworkEntry) =>
  `${e.method} ${e.path} ${JSON.stringify(Object.entries(e.query ?? {}).toSorted(byKey))}`;

function merge(base: Scenario, over: Scenario): Scenario {
  const overKeys = new Set((over.network ?? []).map(routeKey));

  return {
    ...base,
    ...over,
    // Own-only fields: a child describes and finishes rendering differently.
    description: over.description,
    tags: over.tags,
    ready: over.ready,
    // A null param removes the inherited one.
    url: Object.fromEntries(Object.entries({ ...base.url, ...over.url }).filter(([, v]) => v !== null)),
    network: [
      ...(over.network ?? []).filter((e) => !e.remove),
      ...(base.network ?? []).filter((e) => !overKeys.has(routeKey(e))),
    ],
    handlers: union(over.handlers, base.handlers),
    state: mergeState(base.state ?? {}, over.state ?? {}),
  };
}

/**
 * Like `mergeObjects`, except a top-level `null` sets that slice to null (a signed-out `user`)
 * rather than removing it, so capture can record one and replay restores it.
 */
function mergeState(base: JsonObject, over: JsonObject): JsonObject {
  const out = mergeObjects(base, over);

  for (const [k, v] of Object.entries(over)) {
    if (v === null) out[k] = null;
  }

  return out;
}

const union = (a: string[] = [], b: string[] = []) => {
  const all = [...new Set([...a, ...b])];

  return all.length ? all : undefined;
};

const isJsonObject = (value: Json | undefined): value is JsonObject =>
  value instanceof Object && !Array.isArray(value);

function mergeObjects(base: JsonObject, over: JsonObject): JsonObject {
  const out = { ...base };

  for (const [k, v] of Object.entries(over)) {
    if (v === null) delete out[k];
    else out[k] = deepMerge(base[k], v);
  }

  return out;
}

/** Objects merge recursively, `null` deletes a key, anything else replaces. */
export function deepMerge(base: Json | undefined, over: Json): Json {
  return isJsonObject(base) && isJsonObject(over) ? mergeObjects(base, over) : over;
}

/**
 * Inverse of `extends` merge: overrides that turn a resolved `base` into `captured`.
 * Pass the flattened base (from `catalog.resolve`). Copy-link keeps `captured` as-is;
 * Download JSON uses this so the file can `extends` the base instead of repeating it.
 */
export function diffScenario(captured: Scenario, base?: Scenario): ScenarioInput {
  if (!base) {
    return compactScenario({
      name: captured.name,
      description: captured.description,
      tags: captured.tags,
      path: captured.path,
      url: captured.url,
      network: captured.network,
      handlers: captured.handlers,
      state: captured.state,
      ready: captured.ready,
      viewport: captured.viewport,
    });
  }

  const url = diffUrl(base.url, captured.url);
  const network = diffNetwork(base.network ?? [], captured.network ?? []);
  // A slice missing from the capture had no adapter connected: inherit it, since a top-level null
  // would set it to null.
  const state = diffObjects(
    Object.fromEntries(Object.entries(base.state ?? {}).filter(([k]) => k in (captured.state ?? {}))),
    captured.state ?? {},
  );
  const handlers = diffHandlers(base.handlers ?? [], captured.handlers ?? []);

  return compactScenario({
    name: captured.name,
    extends: base.name,
    description: captured.description,
    tags: captured.tags,
    path: captured.path !== base.path ? captured.path : undefined,
    url,
    network: network.length ? network : undefined,
    handlers,
    state,
    ready: captured.ready,
    viewport: jsonEqual(captured.viewport ?? null, base.viewport ?? null) ? undefined : captured.viewport,
  });
}

/**
 * The shortest own list that `extends` merges back into `captured`, order included: merge puts
 * the child's handlers first, then the base's it didn't name. Handler order is precedence.
 */
function diffHandlers(base: string[], captured: string[]): string[] | undefined {
  for (let k = 0; k <= captured.length; k++) {
    const own = captured.slice(0, k);

    if (JSON.stringify(union(own, base)) === JSON.stringify(captured)) return own.length ? own : undefined;
  }

  // An inherited handler can't be removed: keep the captured order and let the base's extras follow.
  return captured.length ? captured : undefined;
}

function diffUrl(
  base: Scenario['url'],
  captured: Scenario['url'],
): ScenarioInput['url'] {
  const baseUrl = base ?? {};
  const capturedUrl = captured ?? {};
  const out: Record<string, string | null> = {};

  for (const [k, v] of Object.entries(capturedUrl)) {
    if (v === null) continue;

    if (baseUrl[k] !== v) out[k] = v;
  }

  for (const [k, v] of Object.entries(baseUrl)) {
    if (v === null) continue;

    if (!(k in capturedUrl) || capturedUrl[k] === null) out[k] = null;
  }

  return Object.keys(out).length ? out : undefined;
}

function diffNetwork(base: NetworkEntry[], captured: NetworkEntry[]): NetworkEntry[] {
  const baseByKey = new Map(base.map((e) => [routeKey(e), e]));
  const capByKey = new Map<string, NetworkEntry>();

  // First match wins in MSW, so a later duplicate route is unreachable; keep the first.
  for (const e of captured) if (!capByKey.has(routeKey(e))) capByKey.set(routeKey(e), e);

  const out: NetworkEntry[] = [];

  for (const [key, e] of capByKey) {
    const prior = baseByKey.get(key);

    if (!prior || !jsonEqual(prior, e)) out.push(e);
  }

  for (const [key, e] of baseByKey) {
    if (!capByKey.has(key)) {
      const removed: NetworkEntry = { method: e.method, path: e.path, remove: true };

      if (e.query) removed.query = e.query;

      out.push(removed);
    }
  }

  return out;
}

function diffObjects(base: JsonObject, captured: JsonObject): JsonObject | undefined {
  const out: JsonObject = {};

  for (const [k, v] of Object.entries(captured)) {
    if (!(k in base)) out[k] = v;
    else if (isJsonObject(base[k]) && isJsonObject(v)) {
      const nested = diffObjects(base[k], v);

      if (nested) out[k] = nested;
    } else if (!jsonEqual(base[k], v)) out[k] = v;
  }

  for (const k of Object.keys(base)) {
    if (!(k in captured)) out[k] = null;
  }

  return Object.keys(out).length ? out : undefined;
}

function jsonEqual(a: Json | NetworkEntry, b: Json | NetworkEntry): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function compactScenario(s: ScenarioInput): ScenarioInput {
  const out: ScenarioInput = { name: s.name };

  if (s.$schema !== undefined) out.$schema = s.$schema;

  if (s.description !== undefined) out.description = s.description;

  if (s.tags !== undefined) out.tags = s.tags;

  if (s.extends !== undefined) out.extends = s.extends;

  if (s.path !== undefined) out.path = s.path;

  if (s.url !== undefined && Object.keys(s.url).length) out.url = s.url;

  if (s.network !== undefined && s.network.length) out.network = s.network;

  if (s.handlers !== undefined && s.handlers.length) out.handlers = s.handlers;

  if (s.state !== undefined && Object.keys(s.state).length) out.state = s.state;

  if (s.ready !== undefined) out.ready = s.ready;

  if (s.viewport !== undefined) out.viewport = s.viewport;

  return out;
}
