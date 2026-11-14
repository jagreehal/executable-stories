/**
 * Spans exported by other processes, joined onto the scenarios that caused them.
 *
 * An adapter only sees spans from its own test process. A scenario that drives a
 * service elsewhere leaves that service's spans in the collector or OTLP HTTP
 * readback that received them. Every scenario records its trace id
 * (`story.meta.otel.traceId`), so the join needs nothing from the adapter.
 *
 * A trace that started during the run with no scenario's context is returned as
 * `unlinked` so the CLI can name it.
 */

import type {
  OtelAttributeValue,
  OtelLog,
  OtelSpan,
  OtelSpanEvent,
  OtelSpanKind,
} from 'executable-stories-core/types/otel';
import type {
  TestCaseResult,
  TestRunResult,
} from 'executable-stories-core/types/test-result';

/** A span with the trace id it arrived under; the report's `OtelSpan` drops it. */
export interface ImportedSpan extends OtelSpan {
  traceId: string;
}

/** A log record with the trace id it was written under; the report's `OtelLog` drops it. */
export interface ImportedLog extends OtelLog {
  traceId: string;
}

/** A trace that started during the run with no scenario's context. */
export interface UnlinkedTrace {
  traceId: string;
  /** The root span: the first thing that ran without a parent. */
  name: string;
  service?: string;
  startTimeMs?: number;
  /** Set only when exactly one scenario was running when it started. */
  scenario?: { id: string; title: string };
}

export interface AttachTracesResult {
  run: TestRunResult;
  /** Spans added to scenarios (duplicates of spans already present excluded). */
  attached: number;
  unlinked: UnlinkedTrace[];
}

/** Same cap the Vitest collector applies, for the same reason: a loop of queries is shape, then repetition. */
const MAX_SPANS_PER_SCENARIO = 500;

// ============================================================================
// Parsing
// ============================================================================

/**
 * Read spans from a sink's shapes: OTLP JSON (`{ resourceSpans }`, one object
 * or one per line), or an OTLP HTTP readback (`{ traces: [{ spans }] }`).
 * Unknown shapes contribute nothing; the caller reports an empty source.
 */
export function parseOtelTraces(text: string): ImportedSpan[] {
  return readDocs(text).flatMap(spansOf);
}

/**
 * Read log records that carry a trace id, from OTLP JSON (`{ resourceLogs }`,
 * one object or one per line) or an OTLP HTTP readback (`{ logs }`). Logs
 * outside a trace are omitted: no scenario owns them.
 */
export function parseOtelLogs(text: string): ImportedLog[] {
  return readDocs(text).flatMap(logsOf);
}

/** One JSON document, or one per line (a collector's file exporter). */
function readDocs(text: string): unknown[] {
  try {
    return [JSON.parse(text)];
  } catch {
    return text
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  }
}

function spansOf(doc: unknown): ImportedSpan[] {
  if (Array.isArray(doc)) return doc.flatMap(spansOf);
  if (!doc || typeof doc !== 'object') return [];
  const obj = doc as Record<string, unknown>;
  if (Array.isArray(obj.resourceSpans)) return fromOtlp(obj.resourceSpans);
  if (Array.isArray(obj.traces)) {
    return obj.traces.flatMap((t) =>
      Array.isArray((t as { spans?: unknown }).spans)
        ? ((t as { spans: unknown[] }).spans
            .map(fromDevtools)
            .filter(Boolean) as ImportedSpan[])
        : [],
    );
  }
  return [];
}

function logsOf(doc: unknown): ImportedLog[] {
  if (Array.isArray(doc)) return doc.flatMap(logsOf);
  if (!doc || typeof doc !== 'object') return [];
  const obj = doc as Record<string, unknown>;
  if (Array.isArray(obj.resourceLogs)) return fromOtlpLogs(obj.resourceLogs);
  if (Array.isArray(obj.logs)) {
    return obj.logs.map(fromDevtoolsLog).filter(Boolean) as ImportedLog[];
  }
  return [];
}

function bodyText(body: unknown): string {
  return typeof body === 'string' ? body : JSON.stringify(body ?? '');
}

function fromOtlpLogs(resourceLogs: unknown[]): ImportedLog[] {
  const out: ImportedLog[] = [];
  for (const rl of resourceLogs as Array<{ scopeLogs?: unknown[] }>) {
    for (const sl of (rl.scopeLogs ?? []) as Array<{
      logRecords?: unknown[];
    }>) {
      for (const r of (sl.logRecords ?? []) as Array<Record<string, unknown>>) {
        const traceId = hexId(r.traceId);
        if (!traceId) continue;
        const spanId = hexId(r.spanId);
        const nanos = Number(r.timeUnixNano || r.observedTimeUnixNano || 0);
        const raw = r.body as
          (OtlpAnyValue & { kvlistValue?: unknown }) | undefined;
        const value = anyValue(raw);
        const attributes = attrs(r.attributes);
        out.push({
          traceId,
          ...(spanId ? { spanId } : {}),
          ...(nanos > 0 ? { timeMs: nanos / 1e6 } : {}),
          ...(typeof r.severityText === 'string' && r.severityText
            ? { severity: r.severityText }
            : {}),
          body:
            value === undefined ? bodyText(raw?.kvlistValue) : bodyText(value),
          ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
        });
      }
    }
  }
  return out;
}

function fromDevtoolsLog(raw: unknown): ImportedLog | undefined {
  const r = raw as {
    traceId?: string;
    spanId?: string;
    timestamp?: number;
    severityText?: string;
    body?: unknown;
    attributes?: Record<string, OtelAttributeValue>;
  };
  const traceId = hexId(r.traceId);
  if (!traceId) return undefined;
  const spanId = hexId(r.spanId);
  return {
    traceId,
    ...(spanId ? { spanId } : {}),
    ...(typeof r.timestamp === 'number' ? { timeMs: r.timestamp } : {}),
    ...(r.severityText ? { severity: r.severityText } : {}),
    body: bodyText(r.body),
    ...(r.attributes && Object.keys(r.attributes).length > 0
      ? { attributes: r.attributes }
      : {}),
  };
}

type OtlpAnyValue = {
  stringValue?: string;
  boolValue?: boolean;
  intValue?: number | string;
  doubleValue?: number;
  arrayValue?: { values?: OtlpAnyValue[] };
};

function anyValue(v: OtlpAnyValue | undefined): OtelAttributeValue | undefined {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.boolValue !== undefined) return v.boolValue;
  if (v.intValue !== undefined) return Number(v.intValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.arrayValue) {
    return (v.arrayValue.values ?? [])
      .map(anyValue)
      .filter((x) => x !== undefined) as string[];
  }
  return undefined;
}

function attrs(list: unknown): Record<string, OtelAttributeValue> {
  const out: Record<string, OtelAttributeValue> = {};
  if (!Array.isArray(list)) return out;
  for (const kv of list as Array<{ key?: string; value?: OtlpAnyValue }>) {
    const value = anyValue(kv.value);
    if (kv.key && value !== undefined) out[kv.key] = value;
  }
  return out;
}

/** OTLP/JSON ids are hex by spec; protobuf-JSON encoders emit base64. Normalise to lowercase hex. */
function hexId(id: unknown): string {
  if (typeof id !== 'string' || id === '') return '';
  if (/^[0-9a-fA-F]+$/.test(id) && (id.length === 32 || id.length === 16))
    return id.toLowerCase();
  return Buffer.from(id, 'base64').toString('hex');
}

/** OTLP numbers kinds from 1 (0 is unspecified); devtools spells them out. */
const OTLP_KINDS: Record<string, OtelSpanKind> = {
  '1': 'internal',
  '2': 'server',
  '3': 'client',
  '4': 'producer',
  '5': 'consumer',
  SPAN_KIND_INTERNAL: 'internal',
  SPAN_KIND_SERVER: 'server',
  SPAN_KIND_CLIENT: 'client',
  SPAN_KIND_PRODUCER: 'producer',
  SPAN_KIND_CONSUMER: 'consumer',
  INTERNAL: 'internal',
  SERVER: 'server',
  CLIENT: 'client',
  PRODUCER: 'producer',
  CONSUMER: 'consumer',
};

function kindOf(kind: unknown): { kind?: OtelSpanKind } {
  const found = kind === undefined || kind === null ? undefined : OTLP_KINDS[String(kind)];
  return found ? { kind: found } : {};
}

function statusFrom(code: unknown): OtelSpan['status'] {
  if (code === 2 || code === 'STATUS_CODE_ERROR' || code === 'ERROR')
    return 'error';
  if (code === 1 || code === 'STATUS_CODE_OK' || code === 'OK') return 'ok';
  return 'unset';
}

function fromOtlp(resourceSpans: unknown[]): ImportedSpan[] {
  const out: ImportedSpan[] = [];
  for (const rs of resourceSpans as Array<{
    resource?: { attributes?: unknown };
    scopeSpans?: unknown[];
  }>) {
    // Resource attributes carry service.name, which is what names a component
    // in the span graph, so every span keeps them.
    const resource = attrs(rs.resource?.attributes);
    for (const ss of (rs.scopeSpans ?? []) as Array<{ spans?: unknown[] }>) {
      for (const s of (ss.spans ?? []) as Array<Record<string, unknown>>) {
        const traceId = hexId(s.traceId);
        const spanId = hexId(s.spanId);
        if (!traceId || !spanId) continue;
        const parentSpanId = hexId(s.parentSpanId);
        const startMs = Number(s.startTimeUnixNano ?? 0) / 1e6;
        const endMs = Number(s.endTimeUnixNano ?? 0) / 1e6;
        const status = s.status as
          { code?: unknown; message?: string } | undefined;
        out.push({
          traceId,
          spanId,
          ...(parentSpanId ? { parentSpanId } : {}),
          name: typeof s.name === 'string' && s.name ? s.name : 'unknown',
          ...(startMs > 0
            ? { startTimeMs: startMs, durationMs: Math.max(0, endMs - startMs) }
            : {}),
          status: statusFrom(status?.code),
          ...(status?.message ? { statusMessage: status.message } : {}),
          ...kindOf(s.kind),
          attributes: { ...resource, ...attrs(s.attributes) },
          ...eventsOf(
            (Array.isArray(s.events) ? s.events : []).map(
              (e: Record<string, unknown>) => ({
                name: String(e.name ?? ''),
                timeMs: Number(e.timeUnixNano ?? 0) / 1e6 || undefined,
                attributes: attrs(e.attributes),
              }),
            ),
          ),
        });
      }
    }
  }
  return out;
}

function fromDevtools(raw: unknown): ImportedSpan | undefined {
  const s = raw as {
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;
    name?: string;
    startTime?: number;
    duration?: number;
    attributes?: Record<string, OtelAttributeValue>;
    status?: { code?: string; message?: string };
    kind?: string;
    events?: Array<{
      name?: string;
      timestamp?: number;
      attributes?: Record<string, OtelAttributeValue>;
    }>;
  };
  const traceId = hexId(s.traceId);
  const spanId = hexId(s.spanId);
  if (!traceId || !spanId) return undefined;
  const parentSpanId = hexId(s.parentSpanId);
  return {
    traceId,
    spanId,
    ...(parentSpanId ? { parentSpanId } : {}),
    name: s.name || 'unknown',
    ...(typeof s.startTime === 'number'
      ? { startTimeMs: s.startTime, durationMs: s.duration ?? 0 }
      : {}),
    status: statusFrom(s.status?.code),
    ...(s.status?.message ? { statusMessage: s.status.message } : {}),
    ...kindOf(s.kind),
    ...(s.attributes ? { attributes: s.attributes } : {}),
    ...eventsOf(
      (s.events ?? []).map((e) => ({
        name: e.name ?? '',
        timeMs: e.timestamp,
        attributes: e.attributes ?? {},
      })),
    ),
  };
}

/** `{ events }` with empty fields dropped, or nothing when there are none. */
function eventsOf(
  events: Array<{
    name: string;
    timeMs?: number;
    attributes: Record<string, OtelAttributeValue>;
  }>,
): { events?: OtelSpanEvent[] } {
  const kept = events
    .filter((e) => e.name)
    .map((e) => ({
      name: e.name,
      ...(e.timeMs ? { timeMs: e.timeMs } : {}),
      ...(Object.keys(e.attributes).length > 0
        ? { attributes: e.attributes }
        : {}),
    }));
  return kept.length > 0 ? { events: kept } : {};
}

// ============================================================================
// Joining
// ============================================================================

function traceIdOf(tc: TestCaseResult): string | undefined {
  const otel = (tc.story.meta as { otel?: { traceId?: unknown } } | undefined)
    ?.otel;
  return typeof otel?.traceId === 'string'
    ? otel.traceId.toLowerCase()
    : undefined;
}

/**
 * Add each imported span to the scenario that ran under its trace id, and name
 * the traces no scenario owns.
 *
 * Only roots that started inside the run's window count as unlinked: a source
 * like a long-lived devtools receiver also holds health checks and earlier
 * runs, and none of those are a propagation break in this run.
 */
export function attachTraces(
  run: TestRunResult,
  spans: ImportedSpan[],
): AttachTracesResult {
  const byTrace = new Map<string, ImportedSpan[]>();
  for (const span of spans) {
    const list = byTrace.get(span.traceId) ?? [];
    list.push(span);
    byTrace.set(span.traceId, list);
  }

  let attached = 0;
  const claimed = new Set<string>();
  const testCases = run.testCases.map((tc) => {
    const traceId = traceIdOf(tc);
    const incoming = traceId ? byTrace.get(traceId) : undefined;
    if (!traceId || !incoming) return tc;
    claimed.add(traceId);
    const existing = tc.story.otelSpans ?? [];
    const seen = new Set(existing.map((s) => s.spanId));
    const added: OtelSpan[] = [];
    for (const { traceId: _drop, ...span } of incoming) {
      if (
        seen.has(span.spanId) ||
        existing.length + added.length >= MAX_SPANS_PER_SCENARIO
      )
        continue;
      seen.add(span.spanId);
      added.push(span);
    }
    if (added.length === 0) return tc;
    attached += added.length;
    return {
      ...tc,
      story: { ...tc.story, otelSpans: [...existing, ...added] },
    };
  });

  const inRun = (ms: number | undefined) =>
    ms === undefined || !run.startedAtMs || !run.finishedAtMs
      ? true
      : ms >= run.startedAtMs && ms <= run.finishedAtMs;

  const unlinked: UnlinkedTrace[] = [];
  for (const [traceId, traceSpans] of byTrace) {
    if (claimed.has(traceId)) continue;
    // A trace whose every span has an absent parent is a fragment (sampling,
    // still in flight), not a request that started fresh.
    const root = traceSpans.find((s) => !s.parentSpanId);
    if (!root || !inRun(root.startTimeMs)) continue;
    const service = root.attributes?.['service.name'];
    const scenario =
      root.startTimeMs === undefined
        ? undefined
        : runningAt(run.testCases, root.startTimeMs);
    unlinked.push({
      traceId,
      name: root.name,
      ...(typeof service === 'string' ? { service } : {}),
      ...(root.startTimeMs !== undefined
        ? { startTimeMs: root.startTimeMs }
        : {}),
      ...(scenario ? { scenario } : {}),
    });
  }
  unlinked.sort((a, b) => (a.startTimeMs ?? 0) - (b.startTimeMs ?? 0));

  return { run: { ...run, testCases }, attached, unlinked };
}

/** The one scenario running at `ms`, or undefined when none or several were (parallel workers). */
function runningAt(
  testCases: TestCaseResult[],
  ms: number,
): { id: string; title: string } | undefined {
  const running = testCases.filter((tc) => {
    const start = tc.story.startedAtMs;
    return start !== undefined && ms >= start && ms <= start + tc.durationMs;
  });
  return running.length === 1
    ? { id: running[0].id, title: running[0].story.scenario }
    : undefined;
}

/** One line per unlinked root, grouped so a polling loop reads as one entry. */
export function describeUnlinked(unlinked: UnlinkedTrace[]): string[] {
  const groups = new Map<string, { count: number; scenarios: Set<string> }>();
  for (const u of unlinked) {
    const key = `${u.service ? `${u.service}: ` : ''}${u.name}`;
    const group = groups.get(key) ?? { count: 0, scenarios: new Set<string>() };
    group.count++;
    if (u.scenario) group.scenarios.add(u.scenario.title);
    groups.set(key, group);
  }
  return [...groups].map(([key, g]) => {
    const times = g.count > 1 ? ` (x${g.count})` : '';
    const during =
      g.scenarios.size > 0 ? ` during "${[...g.scenarios].join('", "')}"` : '';
    return `${key}${times}${during}`;
  });
}

/**
 * Add each log to the scenario whose trace it was written under, in time order.
 * Logs from traces no scenario owns are left out: `attachTraces` already names
 * those traces.
 */
const logKey = (log: OtelLog) =>
  JSON.stringify([log.spanId, log.timeMs, log.severity, log.body]);

export function attachLogs(
  run: TestRunResult,
  logs: ImportedLog[],
): { run: TestRunResult; attached: number } {
  const byTrace = new Map<string, ImportedLog[]>();
  for (const log of logs) {
    const list = byTrace.get(log.traceId) ?? [];
    list.push(log);
    byTrace.set(log.traceId, list);
  }
  let attached = 0;
  const testCases = run.testCases.map((tc) => {
    const traceId = traceIdOf(tc);
    const incoming = traceId ? byTrace.get(traceId) : undefined;
    if (!incoming) return tc;
    const existing = tc.story.otelLogs ?? [];
    // Log records carry no id, so the same span, time, severity and body is the same record:
    // formatting accumulated reports against the same source again must not repeat them.
    const seen = new Set(existing.map(logKey));
    const added: OtelLog[] = [];
    for (const { traceId: _drop, ...log } of incoming) {
      if (existing.length + added.length >= MAX_SPANS_PER_SCENARIO) break;
      const key = logKey(log);
      if (seen.has(key)) continue;
      seen.add(key);
      added.push(log);
    }
    if (added.length === 0) return tc;
    attached += added.length;
    const otelLogs = [...existing, ...added].sort(
      (a, b) => (a.timeMs ?? 0) - (b.timeMs ?? 0),
    );
    return { ...tc, story: { ...tc.story, otelLogs } };
  });
  return { run: { ...run, testCases }, attached };
}
