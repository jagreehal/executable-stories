/**
 * Which API operations the run actually exercised, read from its spans.
 *
 * Code coverage says which lines ran. This says which endpoints a scenario
 * reached, against the contract the team publishes: every operation in an
 * OpenAPI document and every rpc in a `.proto` service, each marked with the
 * scenarios whose spans hit it. An operation no scenario reached has no
 * specified behaviour.
 *
 * Only server-side spans count. A server span names the route it served
 * (`http.route`, or the path it received); a client span carries the URL it
 * called, and calling an endpoint is not proof the endpoint handled it. A span
 * that records its kind counts only when it is the server's; an rpc needs that
 * kind, because its attributes are the same on the calling side.
 * Cross-process server spans arrive through `format --otel-traces`.
 */

import { parseArgs } from 'node:util';
import { canonicalizeRun } from 'executable-stories-core/converters/acl/canonicalize';
import { synthesizeStories } from 'executable-stories-core/converters/synthesize';
import type { TestRunResult } from 'executable-stories-core/types/test-result';
import { parse as parseYaml } from 'yaml';
import { aggregateReports } from './aggregate-reports';

export interface ApiOperation {
  kind: 'http' | 'rpc';
  /** "GET /users/{id}" or "shop.Cart/AddItem". */
  label: string;
  /** Spec file it came from, as given. */
  source: string;
  /** HTTP only. */
  method?: string;
  /** HTTP only: matches a concrete path or a route template. */
  pattern?: RegExp;
  /** HTTP only: path parameters, so `/users/me` beats `/users/{id}`. */
  params?: number;
}

export interface CoveredOperation {
  kind: 'http' | 'rpc';
  label: string;
  source: string;
  scenarios: Array<{ id: string; title: string }>;
}

export interface ApiCoverage {
  total: number;
  covered: number;
  operations: CoveredOperation[];
  /** Operations spans reached that no spec declares: drift, or an undocumented route. */
  undeclared: string[];
}

const HTTP_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Server path prefixes the spec's paths are relative to (OpenAPI 3 `servers`, Swagger 2 `basePath`). */
function basePaths(doc: Record<string, unknown>): string[] {
  const out = new Set<string>(['']);
  if (typeof doc.basePath === 'string')
    out.add(doc.basePath.replace(/\/$/, ''));
  for (const server of (Array.isArray(doc.servers)
    ? doc.servers
    : []) as Array<{ url?: string }>) {
    if (typeof server.url !== 'string') continue;
    try {
      out.add(
        new URL(server.url, 'http://localhost').pathname.replace(/\/$/, ''),
      );
    } catch {
      // A templated server URL that does not parse contributes no prefix.
    }
  }
  return [...out];
}

export function operationsFromOpenApi(
  text: string,
  source: string,
): ApiOperation[] {
  const doc = parseYaml(text) as Record<string, unknown> | null;
  const paths = doc?.paths;
  if (!doc || !paths || typeof paths !== 'object') {
    throw new Error(
      `${source} has no "paths": not an OpenAPI or Swagger document`,
    );
  }
  const prefixes = basePaths(doc).map(escapeRegex);
  const prefix = prefixes.length > 1 ? `(?:${prefixes.join('|')})` : '';
  const ops: ApiOperation[] = [];
  for (const [template, item] of Object.entries(
    paths as Record<string, unknown>,
  )) {
    if (!item || typeof item !== 'object') continue;
    // `{id}` in the spec matches a concrete segment, Express `:id`, or `{id}` in a route.
    const body = template
      .split(/(\{[^}]+\})/)
      .map((part) => (/^\{[^}]+\}$/.test(part) ? '[^/]+' : escapeRegex(part)))
      .join('');
    const pattern = new RegExp(`^${prefix}${body.replace(/\/$/, '')}/?$`);
    const params = (template.match(/\{[^}]+\}/g) ?? []).length;
    for (const method of Object.keys(item)) {
      if (!HTTP_METHODS.includes(method.toLowerCase())) continue;
      const upper = method.toUpperCase();
      ops.push({
        kind: 'http',
        label: `${upper} ${template}`,
        source,
        method: upper,
        pattern,
        params,
      });
    }
  }
  return ops;
}

/** Strip comments, then read `package` and each `service { rpc Name(...) }`. */
export function operationsFromProto(
  text: string,
  source: string,
): ApiOperation[] {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const pkg = /\bpackage\s+([\w.]+)\s*;/.exec(clean)?.[1];
  const ops: ApiOperation[] = [];
  const serviceRe = /\bservice\s+(\w+)\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = serviceRe.exec(clean))) {
    // Walk braces to the service's end: rpcs may carry `{ option ... }` bodies.
    let depth = 1;
    let i = serviceRe.lastIndex;
    for (; i < clean.length && depth > 0; i++) {
      if (clean[i] === '{') depth++;
      else if (clean[i] === '}') depth--;
    }
    const body = clean.slice(serviceRe.lastIndex, i);
    const service = pkg ? `${pkg}.${match[1]}` : match[1];
    for (const rpc of body.matchAll(/\brpc\s+(\w+)\s*\(/g)) {
      ops.push({ kind: 'rpc', label: `${service}/${rpc[1]}`, source });
    }
  }
  return ops;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v !== '' ? v : undefined;
}

/** What a server span says it served: an HTTP method and path, or an rpc. */
function served(
  attributes: Record<string, unknown>,
  spanKind: string | undefined,
):
  | { kind: 'http'; method: string; path: string }
  | { kind: 'rpc'; service: string; method: string }
  | undefined {
  // A span that says which side it is counts only as the server: a client span records a
  // call it made, which proves nothing about the operation handling it.
  if (spanKind !== undefined && spanKind !== 'server') return undefined;
  const rpcService = str(attributes['rpc.service']);
  const rpcMethod = str(attributes['rpc.method']);
  // RPC attributes are identical on both sides, so an rpc needs the kind to say server.
  if (rpcService && rpcMethod) {
    return spanKind === 'server'
      ? { kind: 'rpc', service: rpcService, method: rpcMethod }
      : undefined;
  }
  const method =
    str(attributes['http.request.method']) ?? str(attributes['http.method']);
  // Server semconv only: http.route, url.path (current), http.target (legacy).
  const route =
    str(attributes['http.route']) ??
    str(attributes['url.path']) ??
    str(attributes['http.target']);
  if (!method || !route) return undefined;
  return {
    kind: 'http',
    method: method.toUpperCase(),
    path: route.split('?')[0],
  };
}

export function apiCoverage(
  run: TestRunResult,
  operations: ApiOperation[],
): ApiCoverage {
  const hits = new Map<ApiOperation, Map<string, string>>();
  const undeclared = new Set<string>();
  // Fewest path parameters first, so a literal segment wins over a template.
  const http = operations
    .filter((op) => op.kind === 'http')
    .sort((a, b) => (a.params ?? 0) - (b.params ?? 0));
  const rpc = operations.filter((op) => op.kind === 'rpc');

  for (const tc of run.testCases) {
    for (const span of tc.story.otelSpans ?? []) {
      const s = served(span.attributes ?? {}, span.kind);
      if (!s) continue;
      let op: ApiOperation | undefined;
      if (s.kind === 'http') {
        op = http.find((o) => o.method === s.method && o.pattern!.test(s.path));
        if (!op) undeclared.add(`${s.method} ${s.path}`);
      } else {
        // rpc.service is fully qualified by convention; accept a bare name too.
        op = rpc.find(
          (o) =>
            o.label === `${s.service}/${s.method}` ||
            o.label.endsWith(`.${s.service}/${s.method}`),
        );
        if (!op) undeclared.add(`${s.service}/${s.method}`);
      }
      if (!op) continue;
      const scenarios = hits.get(op) ?? new Map<string, string>();
      scenarios.set(tc.id, tc.story.scenario);
      hits.set(op, scenarios);
    }
  }

  const covered = operations.map((op) => ({
    kind: op.kind,
    label: op.label,
    source: op.source,
    scenarios: [...(hits.get(op) ?? new Map<string, string>())].map(
      ([id, title]) => ({ id, title }),
    ),
  }));
  return {
    total: operations.length,
    covered: covered.filter((op) => op.scenarios.length > 0).length,
    operations: covered,
    undeclared: [...undeclared].sort(),
  };
}

export function renderApiCoverage(result: ApiCoverage): string {
  const pct =
    result.total === 0 ? 0 : Math.round((result.covered / result.total) * 100);
  const lines = [
    `API coverage: ${result.covered} of ${result.total} operations exercised (${pct}%)`,
  ];
  const width = Math.max(0, ...result.operations.map((op) => op.label.length));
  let source: string | undefined;
  for (const op of result.operations) {
    if (op.source !== source) {
      source = op.source;
      lines.push('', source);
    }
    const n = op.scenarios.length;
    const mark = n > 0 ? '✓' : '✗';
    const detail =
      n === 0
        ? ''
        : n === 1
          ? `  ${op.scenarios[0].title}`
          : `  ${n} scenarios`;
    lines.push(`  ${mark} ${op.label.padEnd(width)}${detail}`.trimEnd());
  }
  if (result.undeclared.length > 0) {
    lines.push('', 'Served but declared in no spec:');
    for (const label of result.undeclared) lines.push(`  ${label}`);
  }
  if (result.covered === 0 && result.total > 0) {
    lines.push(
      '',
      'Nothing matched. Server spans are needed: pass `format --otel-traces` when the service runs in another process.',
    );
  }
  return lines.join('\n');
}

// ============================================================================
// CLI: executable-stories coverage api
// ============================================================================

export const API_COVERAGE_HELP = `Usage:
  executable-stories coverage api <run.json|reports-dir> --openapi <spec> [--proto <file>] [--json]

Lists every operation in the given OpenAPI documents (YAML or JSON) and .proto
services, and marks the scenarios whose server spans reached each one.

Spans come from the run: an adapter's own OTel collection, or spans from other
processes joined with \`format --otel-traces\` (point this at reports/by-file
afterwards to see them).

Options:
  --openapi <file>   OpenAPI 3 or Swagger 2 document; repeatable
  --proto <file>     Protocol Buffers file with service definitions; repeatable
  --json             Print the result as JSON
  -h, --help         Show this help

Exit codes: 0 report produced, 4 usage error.`;

export interface ApiCoverageDeps {
  readFile: (file: string) => string;
  isDirectory: (file: string) => boolean;
  listDir: (dir: string) => string[] | undefined;
  log: (msg: string) => void;
  error: (msg: string) => void;
}

function loadRunInput(input: string, deps: ApiCoverageDeps): TestRunResult {
  if (deps.isDirectory(input)) {
    const result = aggregateReports(
      { dir: input.replace(/\\/g, '/') },
      {
        readFile: deps.readFile,
        listDir: deps.listDir,
        logger: { warn: deps.error },
      },
    );
    if (!result) throw new Error(`no per-file reports in ${input}`);
    return result.run;
  }
  const data = JSON.parse(deps.readFile(input)) as Record<string, unknown>;
  // A raw run declares its schema version; a per-file report is already canonical.
  return data.schemaVersion === 1
    ? canonicalizeRun(synthesizeStories(data as never))
    : (data as unknown as TestRunResult);
}

export function runApiCoverage(argv: string[], deps: ApiCoverageDeps): number {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        openapi: { type: 'string', multiple: true },
        proto: { type: 'string', multiple: true },
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (err) {
    deps.error(err instanceof Error ? err.message : String(err));
    deps.error(API_COVERAGE_HELP);
    return 4;
  }
  if (parsed.values.help) {
    deps.log(API_COVERAGE_HELP);
    return 0;
  }
  const input = parsed.positionals[0];
  const specs = [
    ...(parsed.values.openapi ?? []),
    ...(parsed.values.proto ?? []),
  ];
  if (!input || specs.length === 0) {
    deps.error(
      'coverage api needs a run and at least one --openapi or --proto file.',
    );
    deps.error(API_COVERAGE_HELP);
    return 4;
  }

  let run: TestRunResult;
  const operations: ApiOperation[] = [];
  try {
    run = loadRunInput(input, deps);
    for (const file of parsed.values.openapi ?? [])
      operations.push(...operationsFromOpenApi(deps.readFile(file), file));
    for (const file of parsed.values.proto ?? [])
      operations.push(...operationsFromProto(deps.readFile(file), file));
  } catch (err) {
    deps.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return 4;
  }

  const result = apiCoverage(run, operations);
  deps.log(
    parsed.values.json
      ? JSON.stringify(result, null, 2)
      : renderApiCoverage(result),
  );
  return 0;
}
