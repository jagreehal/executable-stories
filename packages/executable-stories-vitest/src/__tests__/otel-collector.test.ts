/**
 * The span collector: the bridge from Vitest's OpenTelemetry instrumentation
 * to a story's trace.
 *
 * Vitest wraps every test in a span, so `story.init()` already captures the
 * trace id. This is the other half: a SpanProcessor that keeps the spans that
 * ended during a trace, so the story can claim them by that id.
 */
import { describe, expect, it } from "vitest";

import { storySpanCollector } from "../otel";

/** A finished span, in the shape an OTel SDK hands a SpanProcessor. */
function endedSpan(traceId: string, spanId: string, name: string) {
  return {
    name,
    spanContext: () => ({ traceId, spanId }),
    status: { code: 0 },
    attributes: {},
    startTime: [0, 0] as [number, number],
    duration: [0, 0] as [number, number],
  };
}

describe("storySpanCollector", () => {
  it("hands back the spans that ended during a trace", () => {
    const collector = storySpanCollector();

    collector.onEnd(endedSpan("trace-1", "a", "checkout.submit"));

    expect(collector.takeSpansForTrace("trace-1").map((s) => s.name)).toEqual([
      "checkout.submit",
    ]);
  });
  it("releases a trace once it has been taken", () => {
    // A suite runs thousands of tests. Holding every trace after the story
    // that wanted it has finished is a leak with no reader.
    const collector = storySpanCollector();
    collector.onEnd(endedSpan("trace-1", "a", "checkout.submit"));

    collector.takeSpansForTrace("trace-1");

    expect(collector.takeSpansForTrace("trace-1")).toEqual([]);
  });
  it("keeps concurrent traces apart", () => {
    // Vitest runs test files in parallel workers, and a story that claimed
    // another test's spans would draw an architecture it never exercised.
    const collector = storySpanCollector();
    collector.onEnd(endedSpan("trace-1", "a", "checkout.submit"));
    collector.onEnd(endedSpan("trace-2", "b", "inventory.reserve"));
    collector.onEnd(endedSpan("trace-1", "c", "payments.charge"));

    expect(collector.takeSpansForTrace("trace-1").map((s) => s.name)).toEqual([
      "checkout.submit",
      "payments.charge",
    ]);
    expect(collector.takeSpansForTrace("trace-2").map((s) => s.name)).toEqual([
      "inventory.reserve",
    ]);
  });
  it("caps a single trace so heavy instrumentation cannot grow without bound", () => {
    // Auto-instrumentation on a loop of a thousand queries produces a thousand
    // near-identical leaf spans. The architecture is already fully described by
    // the first few hundred, so the tail is dropped rather than buffered.
    const collector = storySpanCollector();
    for (let i = 0; i < 1000; i++) {
      collector.onEnd(endedSpan("trace-1", `s${i}`, `db.query.${i}`));
    }

    const spans = collector.takeSpansForTrace("trace-1");
    // The exact cap, not merely "fewer than were offered": a cap of 999 or of 1
    // would both satisfy a bound, and neither is the documented behaviour.
    expect(spans).toHaveLength(500);
    // The root and the calls below it come first, so keeping the head keeps
    // the shape and drops the repetition. Both ends, so this pins which 500.
    expect(spans[0]?.name).toBe("db.query.0");
    expect(spans.at(-1)?.name).toBe("db.query.499");
  });
  it("carries the parent link, without which the graph has no edges", () => {
    const collector = storySpanCollector();
    collector.onEnd({
      ...endedSpan("trace-1", "child", "payments.charge"),
      parentSpanContext: { traceId: "trace-1", spanId: "root" },
    });

    expect(collector.takeSpansForTrace("trace-1")[0]?.parentSpanId).toBe("root");
  });
  it("reads the parent from a bare id, as older OTel SDKs supply it", () => {
    // The parent moved from `parentSpanId` to `parentSpanContext` across SDK
    // versions and this package pins neither, so both shapes have to work. A
    // suite on an older SDK would otherwise get a graph of orphans: every node
    // present, no edge between any of them.
    const collector = storySpanCollector();
    collector.onEnd({
      ...endedSpan("trace-1", "child", "payments.charge"),
      parentSpanId: "root",
    });
    // And when an SDK supplies both, the current field decides.
    collector.onEnd({
      ...endedSpan("trace-1", "other", "inventory.reserve"),
      parentSpanContext: { traceId: "trace-1", spanId: "current" },
      parentSpanId: "legacy",
    });

    expect(
      collector.takeSpansForTrace("trace-1").map((s) => s.parentSpanId),
    ).toEqual(["root", "current"]);
  });
  it("carries the attributes the graph names components from", () => {
    // `peer.service`, `db.system` and the rest are what turn a span into a
    // named component. Without them every node falls back to a span-name
    // prefix, which is a much worse picture.
    const collector = storySpanCollector();
    collector.onEnd({
      ...endedSpan("trace-1", "a", "SELECT orders"),
      attributes: { "db.system": "postgres", "db.namespace": "orders" },
    });

    expect(collector.takeSpansForTrace("trace-1")[0]?.attributes).toEqual({
      "db.system": "postgres",
      "db.namespace": "orders",
    });
  });
  it("carries an error status, which is what marks a failing component", () => {
    // OTel status codes: 0 UNSET, 1 OK, 2 ERROR.
    const collector = storySpanCollector();
    collector.onEnd({
      ...endedSpan("trace-1", "a", "payments.charge"),
      status: { code: 2, message: "card declined" },
    });
    collector.onEnd({
      ...endedSpan("trace-1", "b", "checkout.submit"),
      status: { code: 1 },
    });

    const [failed, fine] = collector.takeSpansForTrace("trace-1");
    expect(failed?.status).toBe("error");
    expect(failed?.statusMessage).toBe("card declined");
    expect(fine?.status).toBe("ok");
  });
});
