/**
 * OTel span types for trace waterfall rendering.
 *
 * Structurally compatible with autotel's SerializedSpan
 * and raw OTel nanosecond formats. No import dependency on autotel.
 */

export type OtelAttributeValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | boolean[];

export interface OtelSpan {
  spanId: string;
  parentSpanId?: string;
  name: string;
  /** Preferred: epoch-based milliseconds (from autotel's SerializedSpan) */
  startTimeMs?: number;
  durationMs?: number;
  /** Compatibility: raw OTel nanosecond timestamps */
  startTimeUnixNano?: number;
  endTimeUnixNano?: number;
  status: "ok" | "error" | "unset";
  statusMessage?: string;
  attributes?: Record<string, OtelAttributeValue>;
  /** Things that happened inside the span: a recorded exception, a console message. */
  events?: OtelSpanEvent[];
  /** Server or client side of a call, when the source recorded it; API coverage counts only server spans. */
  kind?: OtelSpanKind;
}

export type OtelSpanKind = "internal" | "server" | "client" | "producer" | "consumer";

/** A span event. `exception` events carry `exception.type`, `exception.message`, `exception.stacktrace`. */
export interface OtelSpanEvent {
  name: string;
  /** Epoch milliseconds. */
  timeMs?: number;
  attributes?: Record<string, OtelAttributeValue>;
}

/**
 * An OTel log record joined to a scenario by trace id. Ingest-only: no adapter
 * emits these; `format --otel-logs` reads them from wherever logs were exported.
 */
export interface OtelLog {
  /** The span that was active when the log was written; absent for trace-level logs. */
  spanId?: string;
  /** Epoch milliseconds. */
  timeMs?: number;
  /** Severity text as emitted ("INFO", "ERROR", ...). */
  severity?: string;
  body: string;
  attributes?: Record<string, OtelAttributeValue>;
}
