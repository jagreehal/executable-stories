/**
 * Collect the spans Vitest's OpenTelemetry instrumentation produces, so a
 * story can claim the ones that belong to it.
 *
 * Vitest wraps every test in a span, which means `story.init()` already
 * captures a trace id with no extra wiring. This is the other half: a
 * SpanProcessor that keeps finished spans grouped by trace id, so the story
 * can take its own at the end of the test.
 */

/** A finished span, in the shape an OTel SDK hands a SpanProcessor. */
export interface ReadableSpanLike {
  name: string;
  spanContext(): { traceId: string; spanId: string };
  /** Current OTel SDKs. */
  parentSpanContext?: { spanId: string };
  /** Older OTel SDKs carried the parent as a bare id. */
  parentSpanId?: string;
  attributes?: Record<string, unknown>;
  status?: { code: number; message?: string };
}

/** A span in the shape the story report carries. */
export interface CollectedSpan {
  spanId: string;
  parentSpanId?: string;
  name: string;
  attributes?: Record<string, unknown>;
  status: "ok" | "error" | "unset";
  statusMessage?: string;
}

/**
 * Structurally an OpenTelemetry `SpanProcessor`, plus the drain the story API
 * uses. Declared here rather than imported so the published types carry no
 * OTel dependency; `otel-span-processor.test.ts` holds it to the real
 * interface by handing one to a real tracer provider.
 *
 * `onStart`, `forceFlush` and `shutdown` are not optional. A provider wraps
 * every processor in a `MultiSpanProcessor`, which calls all three without
 * checking they exist — only `onEnding` is guarded — so a collector missing
 * one throws on the first span of the run.
 */
export interface StorySpanCollector {
  onStart(): void;
  onEnd(span: ReadableSpanLike): void;
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
  takeSpansForTrace(traceId: string): CollectedSpan[];
}

/**
 * Spans kept per trace. Auto-instrumentation on a loop of queries produces
 * hundreds of near-identical leaf spans, and the architecture is described by
 * the first few of them. The head is kept because a trace arrives roughly
 * root-first, so keeping it keeps the shape and drops the repetition.
 */
const MAX_SPANS_PER_TRACE = 500;

/** OTel SpanStatusCode: 0 UNSET, 1 OK, 2 ERROR. */
function statusOf(code: number | undefined): "ok" | "error" | "unset" {
  if (code === 2) return "error";
  if (code === 1) return "ok";
  return "unset";
}

/**
 * The collector the story API drains from, parked on `globalThis`.
 *
 * A module-level variable would be wrong here. The collector is constructed in
 * the OTel SDK module Vitest loads, and the story API is imported by the test
 * file; those are not guaranteed to be the same module instance, and a test
 * that mocks anything in the story API's import chain gets a second module
 * graph where a module-level `installed` reads as undefined. The realm is the
 * only thing both sides reliably share.
 *
 * Still per-worker: Vitest gives each worker its own realm, so two workers
 * never see each other's spans.
 */
const REGISTRY = Symbol.for("executable-stories.span-collector");

type Registry = { [REGISTRY]?: StorySpanCollector };

function registry(): Registry {
  return globalThis as unknown as Registry;
}

/**
 * The spans that ended during `traceId`, or none when no collector is
 * installed. Called by `story.init()` at test end; a suite that never
 * configured OpenTelemetry gets an empty list and no behaviour change.
 */
export function takeCollectedSpans(traceId: string): CollectedSpan[] {
  return registry()[REGISTRY]?.takeSpansForTrace(traceId) ?? [];
}

export function storySpanCollector(): StorySpanCollector {
  const byTrace = new Map<string, CollectedSpan[]>();

  const collector: StorySpanCollector = {
    // Nothing to do at span start: a span is only useful once it has ended and
    // carries its duration, status and attributes. Present because the SDK
    // calls it, not because it has work.
    onStart() {},
    onEnd(span) {
      const { traceId, spanId } = span.spanContext();
      const spans = byTrace.get(traceId) ?? [];
      if (spans.length >= MAX_SPANS_PER_TRACE) return;
      // The parent moved from a bare id to a span context across OTel SDK
      // versions, and this package pins neither.
      const parentSpanId = span.parentSpanContext?.spanId ?? span.parentSpanId;
      spans.push({
        spanId,
        ...(parentSpanId ? { parentSpanId } : {}),
        name: span.name,
        ...(span.attributes && Object.keys(span.attributes).length > 0
          ? { attributes: span.attributes }
          : {}),
        status: statusOf(span.status?.code),
        ...(span.status?.message ? { statusMessage: span.status.message } : {}),
      });
      byTrace.set(traceId, spans);
    },
    // Nothing is buffered for export and nothing outlives the worker, so both
    // lifecycle calls have nothing to do. Spans are held in memory until the
    // story that owns them takes them, and a shutdown must not discard them:
    // an SDK shut down before the last story drains would otherwise lose it.
    async forceFlush() {},
    async shutdown() {},
    takeSpansForTrace(traceId) {
      const spans = byTrace.get(traceId) ?? [];
      byTrace.delete(traceId);
      return spans;
    },
  };

  registry()[REGISTRY] = collector;
  return collector;
}
