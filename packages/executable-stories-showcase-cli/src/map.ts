import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Catalog } from 'executable-stories-showcase';
import { z } from 'zod';

/**
 * One row of a scenario map: the tables `/create-scenario-map` writes into
 * `.agents/skills/scenarios-<app>/`. Any Markdown table with Scenario and Status columns counts;
 * Feature, Route, State and Source are optional.
 */
export interface MapRow {
  feature: string;
  route: string;
  state: string;
  /** Empty when the state has no scenario yet. */
  scenario: string;
  status: 'covered' | 'missing' | 'cant-mock' | 'other';
  /** Files or folders that render this state, as paths from the project root. */
  source: string[];
  /** The map file and line, so a reader can fix the row. */
  at: string;
}

const cells = (line: string) =>
  line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replaceAll('`', ''));

const statusOf = (text: string): MapRow['status'] => {
  const s = text.toLowerCase().replace(/[^a-z]/g, '');

  if (s === 'covered') return 'covered';

  if (s === 'missing') return 'missing';

  if (s === 'cantmock') return 'cant-mock';

  return 'other';
};

/** Rows of every map table in one Markdown file. */
export function parseMap(text: string, file: string): MapRow[] {
  const rows: MapRow[] = [];
  const lines = text.split('\n');
  let columns: string[] | undefined;

  for (const [i, line] of lines.entries()) {
    if (!line.trim().startsWith('|')) {
      columns = undefined;
      continue;
    }

    const row = cells(line);

    if (row.every((c) => /^:?-+:?$/.test(c))) continue;

    if (!columns) {
      const names = row.map((c) => c.toLowerCase());
      // Only a table with both columns is a map; other tables in the file are prose.
      columns = names.includes('scenario') && names.includes('status') ? names : [];
      continue;
    }

    if (!columns.length) continue;

    const get = (name: string) => row[columns?.indexOf(name) ?? -1] ?? '';
    const scenario = get('scenario');

    rows.push({
      feature: get('feature'),
      route: get('route'),
      state: get('state'),
      scenario: /^[a-z0-9][a-z0-9,-]*$/.test(scenario) ? scenario : '',
      status: statusOf(get('status')),
      source: get('source').split(/[\s,]+/).filter(Boolean),
      at: `${file}:${i + 1}`,
    });
  }

  return rows;
}

/** Markdown files under the given paths, or under `.agents/skills/scenarios-*` when none are given. */
export function findMapFiles(paths: string[] | undefined, cwd = '.'): string[] {
  const skills = join(cwd, '.agents/skills');

  const roots = paths
    ?? (existsSync(skills)
      ? readdirSync(skills).filter((d) => d.startsWith('scenarios-')).map((d) => join(skills, d))
      : []);

  const walk = (path: string): string[] =>
    statSync(path).isDirectory()
      ? readdirSync(path).flatMap((f) => walk(join(path, f)))
      : path.endsWith('.md')
      ? [path]
      : [];

  return roots.flatMap(walk);
}

export const readMap = (files: string[]) => files.flatMap((f) => parseMap(readFileSync(f, 'utf8'), f));

/** Scenarios another scenario extends: bases such as `default`, not states of their own. */
const bases = (catalog: Catalog) => new Set(catalog.list.flatMap((s) => [s.extends ?? []].flat()));

/**
 * How much of the map has scenarios. `stale` rows name a scenario the folder doesn't have;
 * `unmapped` scenarios are states no row mentions (bases excluded).
 */
export function coverage(rows: MapRow[], catalog: Catalog) {
  // A row may name several scenarios ("a,b"); it is stale when any of them doesn't exist.
  const names = (r: MapRow) => r.scenario.split(',').filter(Boolean);
  const stale = rows.filter((r) => r.status === 'covered' && (!names(r).length || names(r).some((n) => !catalog.get(n))));
  const covered = rows.filter((r) => r.status === 'covered').length - stale.length;
  // A stale row's state has no scenario, so it counts as missing.
  const missing = rows.filter((r) => r.status === 'missing').length + stale.length;
  const mapped = new Set(rows.flatMap(names));
  const skip = bases(catalog);

  return {
    states: rows.length,
    covered,
    missing,
    cantMock: rows.filter((r) => r.status === 'cant-mock').length,
    /** Covered over states that can be mocked; 1 when there is nothing to cover. */
    ratio: covered + missing ? covered / (covered + missing) : 1,
    missingStates: rows.filter((r) => r.status === 'missing'),
    stale,
    unmapped: catalog.list.map((s) => s.name).filter((n) => !mapped.has(n) && !skip.has(n)),
  };
}

export interface ChangedFile {
  /** From the project root, `/`-separated. */
  path: string;
  /** Undefined for a deleted file. */
  content?: string;
}

export interface Reason {
  kind: 'scenario' | 'extends' | 'map' | 'endpoint' | 'route';
  detail: string;
}

const isSource = (path: string) => /\.(tsx?|jsx?|mjs|cjs|vue|svelte|astro|css|scss|less|html)$/.test(path);

/**
 * The part of an MSW path a source file would contain: no origin, cut before the first
 * `:param` or wildcard. Undefined when what's left is too generic to mean one endpoint
 * (`/`, `/api`, `/v2`).
 */
export function endpointStem(path: string): string | undefined {
  const local = path.replace(/^[a-z]+:\/\/[^/]+/i, '').split('?')[0] ?? '';
  const segments: string[] = [];

  for (const s of local.split('/').filter(Boolean)) {
    if (s.startsWith(':') || s.includes('*')) break;
    segments.push(s);
  }

  const specific = segments.some((s) => !/^(api|v\d+|graphql)$/i.test(s));

  return specific ? `/${segments.join('/')}` : undefined;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Which scenarios a set of changed files can affect, each with why. Strongest first: a changed
 * scenario file (and the scenarios that extend it), a map row whose Source covers the file, a file
 * that calls an endpoint the scenario mocks, a file under a folder named like the scenario's route.
 * `unmatched` lists changed source files nothing pointed at, deleted ones included; shared ones
 * (layout, theme) can change every state.
 */
export function affectedScenarios(
  { changed, dir, catalog, rows }: { changed: ChangedFile[]; dir: string; catalog: Catalog; rows: MapRow[]; },
) {
  const found = new Map<string, Reason[]>();
  const matched = new Set<string>();

  const add = (name: string, reason: Reason, file?: string) => {
    if (!catalog.get(name)) return;

    const reasons = found.get(name) ?? [];

    if (!reasons.some((r) => r.kind === reason.kind && r.detail === reason.detail)) reasons.push(reason);
    found.set(name, reasons);

    if (file) matched.add(file);
  };

  const folder = `${dir.replace(/^\.\//, '').replace(/\/$/, '')}/`;

  // 1. Scenario files.
  for (const file of changed) {
    if (!file.path.startsWith(folder) || !file.path.endsWith('.json') || file.content === undefined) continue;

    try {
      // A file without a name isn't a scenario (e.g. scenario.schema.json).
      const named = z.object({ name: z.string() }).safeParse(JSON.parse(file.content));

      if (named.success) add(named.data.name, { kind: 'scenario', detail: file.path }, file.path);
    } catch {
      // Invalid JSON: validate reports it.
    }
  }

  const sources = changed.filter((f) => isSource(f.path));

  // 2. Map rows that name the file, or a folder holding it.
  for (const row of rows) {
    for (const source of row.source) {
      const prefix = source.replace(/^\.\//, '');

      for (const file of sources) {
        if (file.path === prefix || file.path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)) {
          for (const name of row.scenario.split(',').filter(Boolean)) {
            add(name, { kind: 'map', detail: `${row.feature || row.state} (${source})` }, file.path);
          }
        }
      }
    }
  }

  // 3 and 4. What each scenario mocks and where it opens, against what changed.
  for (const s of catalog.list) {
    const resolved = catalog.resolve(s);

    for (const entry of resolved.network ?? []) {
      const stem = endpointStem(entry.path);

      if (!stem) continue;
      const pattern = new RegExp(`${escape(stem)}(?![\\w-])`);

      for (const file of sources) {
        if (file.content && pattern.test(file.content)) {
          add(s.name, { kind: 'endpoint', detail: `${file.path} calls ${stem}` }, file.path);
        }
      }
    }

    const route = resolved.path?.split(/[/?#]/).find((p) => p.length >= 3 && !p.startsWith(':'))
      ?.toLowerCase();

    if (!route) continue;

    for (const file of sources) {
      const parts = file.path.toLowerCase().split('/').map((p) => p.replace(/\.[^.]+$/, ''));

      if (parts.includes(route)) {
        add(s.name, { kind: 'route', detail: `${file.path} is under /${route}` }, file.path);
      }
    }
  }

  // 5. Everything that extends a scenario found above, however it was found: a child inherits its
  // parent's fixtures and route, so whatever changes the parent can change the child.
  const children = (parent: string) =>
    catalog.list.filter((s) => [s.extends ?? []].flat().includes(parent)).map((s) => s.name);

  const queue = [...found.keys()];

  for (let parent = queue.shift(); parent !== undefined; parent = queue.shift()) {
    for (const child of children(parent)) {
      if (!found.has(child)) queue.push(child);
      add(child, { kind: 'extends', detail: parent });
    }
  }

  // An inherited match is only as strong as its parent's own reason, so a child never sorts ahead
  // of the parent that brought it in.
  const strength: Reason['kind'][] = ['scenario', 'extends', 'map', 'endpoint', 'route'];
  const ranks = new Map<string, number>();

  const rank = (name: string): number => {
    const known = ranks.get(name);

    if (known !== undefined) return known;
    ranks.set(name, strength.length); // a cycle in extends counts as the weakest
    const best = Math.min(
      ...(found.get(name) ?? []).map((r) => (r.kind === 'extends' ? rank(r.detail) : strength.indexOf(r.kind))),
    );
    ranks.set(name, best);

    return best;
  };

  return {
    scenarios: [...found]
      .map(([name, reasons]) => ({ name, reasons }))
      .toSorted((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name)),
    // Deleted files included: removing a shared stylesheet or component can change every state.
    unmatched: sources.filter((f) => !matched.has(f.path)).map((f) => f.path),
  };
}
