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
}
