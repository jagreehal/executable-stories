/**
 * Spans reach a story without the test asking.
 *
 * Vitest's OpenTelemetry instrumentation wraps every test in a span, so
 * `story.init()` already captures the trace id. With the collector installed in
 * the SDK, the spans that ended during the test are claimed by that id at test
 * end, and `story.attachSpans` becomes something only hand-rolled setups need.
 */
import { afterAll, describe, expect, it, vi } from "vitest";

const TRACE_ID = "11112222333344445555666677778888";

// An active Vitest span is exactly what this feature depends on, so the test
// stands one up rather than mocking the story API's own internals.
vi.mock("executable-stories-core/utils/otel-detect", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    tryGetActiveOtelContext: () => ({ traceId: TRACE_ID, spanId: "root" }),
  };
});

import { story } from "../story-api";
import { storySpanCollector } from "../otel";

function endedSpan(traceId: string, spanId: string, name: string) {
  return {
    name,
    spanContext: () => ({ traceId, spanId }),
    status: { code: 1 },
  };
}

describe("collected spans reach the story", () => {
  // The drain runs in the story's own onTestFinished, which Vitest fires after
  // afterEach, so the finished meta only exists once the whole file is done.
  // afterAll is the first point a caller can see what the reporter will read,
  // and the reference is captured because the task object a hook receives is
  // not the one the test body held.
  let underTest: { meta: Record<string, unknown> } | undefined;

  afterAll(() => {
    const spans = underTest?.meta.otelSpans as { name: string }[] | undefined;
    expect(spans?.map((s) => s.name)).toEqual([
      "checkout.submit",
      "payments.charge",
    ]);
  });

  it("attaches the spans that ended during the test, with no attachSpans call", ({
    task,
  }) => {
    underTest = task as unknown as { meta: Record<string, unknown> };
    const collector = storySpanCollector();
    story.init(task);

    // The application does its work; the SDK ends its spans.
    collector.onEnd(endedSpan(TRACE_ID, "a", "checkout.submit"));
    collector.onEnd(endedSpan(TRACE_ID, "b", "payments.charge"));
  });
});
