/**
 * A test that attaches its own spans keeps them.
 *
 * The auto-drain exists for suites with no OpenTelemetry wiring of their own.
 * A suite that already runs an SDK and hands spans over with
 * `story.attachSpans()` has curated exactly what it wants on the scenario, and
 * the collector must not overwrite that with whatever else happened to end
 * inside the same trace.
 */
import { afterAll, describe, expect, it, vi } from "vitest";

const TRACE_ID = "99998888777766665555444433332222";

// The auto-drain only runs when init() captured a trace id, so this test needs
// an active Vitest span exactly as the auto-attach case does.
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

describe("hand-attached spans beat collected ones", () => {
  // The drain runs in the story's own onTestFinished, which Vitest fires after
  // afterEach, so the finished meta only exists once the file is done.
  let underTest: { meta: Record<string, unknown> } | undefined;
  let collector: ReturnType<typeof storySpanCollector>;

  afterAll(() => {
    const spans = underTest?.meta.otelSpans as { name: string }[] | undefined;
    expect(spans?.map((s) => s.name)).toEqual(["hand.picked"]);

    // And the collected ones are still sitting in the collector, which is what
    // separates "the drain was skipped" from "the drain ran and its result was
    // thrown away". Only the first leaves them claimable.
    expect(collector.takeSpansForTrace(TRACE_ID).map((s) => s.name)).toEqual([
      "auto.collected",
    ]);
  });

  it("keeps what the test attached, not what the SDK collected", ({ task }) => {
    underTest = task as unknown as { meta: Record<string, unknown> };
    collector = storySpanCollector();
    story.init(task);

    collector.onEnd(endedSpan(TRACE_ID, "a", "auto.collected"));
    story.attachSpans([{ name: "hand.picked" }]);
  });
});
