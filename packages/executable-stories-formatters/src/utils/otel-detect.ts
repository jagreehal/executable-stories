/**
 * OTel trace context detection.
 *
 * Detects an active OpenTelemetry span via `@opentelemetry/api` (optional peer).
 * Uses `createRequire` so the import is lazy and never breaks if OTel isn't installed.
 */

import { createRequire } from "node:module";

export interface OtelTraceContext {
  traceId: string;
  spanId: string;
}

/**
 * Build a require function that works in both ESM and CJS bundles.
 * In ESM, import.meta.url is defined. In CJS (e.g. tsup output), it is
 * shimmed to undefined — fall back to __filename which CJS always has.
 */
function getRequire(): NodeRequire {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const url = import.meta.url
    ?? (typeof __filename !== "undefined" ? `file://${__filename}` : undefined);
  if (!url) throw new Error("Cannot determine module URL");
  return createRequire(url);
}

/**
 * Try to read trace context from the currently-active OTel span.
 * Returns `undefined` when `@opentelemetry/api` is not installed or no span is active.
 */
export function tryGetActiveOtelContext(): OtelTraceContext | undefined {
  try {
    const api = getRequire()("@opentelemetry/api");
    const span = api.trace?.getActiveSpan?.();
    if (!span) return undefined;
    const ctx = span.spanContext?.();
    if (!ctx?.traceId || ctx.traceId === "00000000000000000000000000000000")
      return undefined;
    return { traceId: ctx.traceId, spanId: ctx.spanId };
  } catch {
    return undefined;
  }
}

/**
 * Replace `{traceId}` in a URL template.
 * Returns `undefined` when no template is provided.
 */
export function resolveTraceUrl(
  template: string | undefined,
  traceId: string,
): string | undefined {
  if (!template) return undefined;
  return template.replace(/\{traceId\}/g, traceId);
}
