/**
 * The collector is handed to an OTel SDK, so it has to *be* a SpanProcessor.
 *
 * `MultiSpanProcessor` — what a provider wraps every processor in — calls
 * `onStart`, `forceFlush` and `shutdown` without checking they exist. Only
 * `onEnding` is guarded. A collector carrying just `onEnd` therefore throws on
 * the first span the SDK starts, which is the very first test in the run.
 *
 * Driving a real provider is the only thing that proves otherwise: a
 * hand-rolled double would assert the contract as I imagine it, which is
 * exactly the mistake being guarded against here.
 */
import { BasicTracerProvider, type SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { describe, expect, it } from "vitest";
import { storySpanCollector } from "../otel";

describe("the collector as an OTel SpanProcessor", () => {
  it("collects through a real tracer provider, start to shutdown", async () => {
    const collector = storySpanCollector();

    const provider = new BasicTracerProvider({
      // The compile-time half: our interface has to satisfy OTel's, so a
      // missing method fails type-check rather than the first user's run.
      spanProcessors: [collector satisfies SpanProcessor],
    });

    const tracer = provider.getTracer("story-test");
    const span = tracer.startSpan("checkout.submit");
    const { traceId } = span.spanContext();
    span.end();

    // Both lifecycle calls a shutting-down SDK makes.
    await provider.forceFlush();
    await provider.shutdown();

    expect(collector.takeSpansForTrace(traceId).map((s) => s.name)).toEqual([
      "checkout.submit",
    ]);
  });
});
