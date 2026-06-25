/**
 * Pure span normalization + tree building for the OTel trace waterfall.
 * Ported from the formatters trace-view renderer so the React waterfall shows
 * the same structure. Side-effect-free for unit testing.
 */

import type { OtelSpan } from "executable-stories-core/types/otel";

export interface NormalizedSpan {
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTimeMs: number;
  durationMs: number;
  status: "ok" | "error" | "unset";
  statusMessage?: string;
}

export interface TraceRow extends NormalizedSpan {
  depth: number;
}

const VALID = new Set(["ok", "error", "unset"]);
const safeStatus = (s: string): NormalizedSpan["status"] => (VALID.has(s) ? (s as NormalizedSpan["status"]) : "unset");

export function normalizeSpans(spans: readonly OtelSpan[]): NormalizedSpan[] {
  const out: NormalizedSpan[] = [];
  for (const span of spans) {
    if (!span || typeof span.spanId !== "string" || typeof span.name !== "string") continue;
    let startTimeMs: number;
    let durationMs: number;
    if (span.startTimeMs != null && span.durationMs != null) {
      startTimeMs = span.startTimeMs;
      durationMs = span.durationMs;
    } else if (span.startTimeUnixNano != null && span.endTimeUnixNano != null) {
      startTimeMs = span.startTimeUnixNano / 1e6;
      durationMs = (span.endTimeUnixNano - span.startTimeUnixNano) / 1e6;
    } else {
      continue;
    }
    durationMs = Math.max(0, durationMs);
    if (!isFinite(startTimeMs) || !isFinite(durationMs)) continue;
    out.push({
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.name,
      startTimeMs,
      durationMs,
      status: safeStatus(span.status),
      statusMessage: span.statusMessage,
    });
  }
  return out;
}

/** Flatten spans into rows in tree order with a depth, parent before children. */
export function toTraceRows(spans: readonly OtelSpan[]): TraceRow[] {
  const normalized = normalizeSpans(spans);
  if (normalized.length === 0) return [];

  interface Node {
    span: NormalizedSpan;
    children: Node[];
    depth: number;
  }
  const byId = new Map<string, Node>();
  for (const span of normalized) {
    let key = span.spanId;
    let suffix = 2;
    while (byId.has(key)) key = `${span.spanId}__dup${suffix++}`;
    byId.set(key, { span: { ...span, spanId: key }, children: [], depth: 0 });
  }

  const roots: Node[] = [];
  for (const node of byId.values()) {
    const parent = node.span.parentSpanId ? byId.get(node.span.parentSpanId) : undefined;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  for (const node of byId.values()) node.children.sort((a, b) => a.span.startTimeMs - b.span.startTimeMs);
  roots.sort((a, b) => a.span.startTimeMs - b.span.startTimeMs);

  const rows: TraceRow[] = [];
  const seen = new Set<string>();
  const walk = (node: Node, depth: number): void => {
    if (seen.has(node.span.spanId)) return;
    seen.add(node.span.spanId);
    rows.push({ ...node.span, depth });
    for (const child of node.children) walk(child, depth + 1);
  };
  for (const root of roots) walk(root, 0);
  // Orphans from cycles: promote to depth 0.
  for (const node of byId.values()) {
    if (!seen.has(node.span.spanId)) walk(node, 0);
  }
  return rows;
}

export interface TraceWindow {
  minStartMs: number;
  totalMs: number;
}

export function traceWindow(rows: readonly TraceRow[]): TraceWindow {
  let min = Infinity;
  let max = -Infinity;
  for (const r of rows) {
    min = Math.min(min, r.startTimeMs);
    max = Math.max(max, r.startTimeMs + r.durationMs);
  }
  const total = max - min;
  return { minStartMs: isFinite(min) ? min : 0, totalMs: total > 0 ? total : 1 };
}
