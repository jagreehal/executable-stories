/**
 * Tests the capture-then-attach trace path: when no OTel span is active at
 * story.init() time (the test starts its own root span later), the trace
 * badge + "View Trace" link are wired by story.attachSpans(spans, { traceId }).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// No active OTel context at init() — this is the whole point of this path.
vi.mock("executable-stories-formatters", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    tryGetActiveOtelContext: () => undefined,
  };
});

import { story } from "../story-api";
import type { StoryMeta, DocEntry } from "../types";

function getStoryMeta(task: { meta: object }): StoryMeta {
  return (task.meta as { story: StoryMeta }).story;
}

const TRACE_ID = "11112222333344445555666677778888";

describe("attachSpans trace bridge", () => {
  beforeEach(() => {
    delete process.env.OTEL_TRACE_URL_TEMPLATE;
  });

  it("wires otel meta + View Trace link from an explicit traceId", ({
    task,
  }) => {
    story.init(task, {
      traceUrlTemplate: "http://localhost:4848/#trace={traceId}",
    });
    story.attachSpans([{ spanId: "aaaa", name: "fetchRates" }], {
      traceId: TRACE_ID,
      spanId: "aaaa",
    });

    const meta = getStoryMeta(task);
    const otel = (meta.meta as Record<string, unknown>)?.otel as {
      traceId: string;
      spanId: string;
    };
    expect(otel.traceId).toBe(TRACE_ID);
    expect(otel.spanId).toBe("aaaa");

    const link = meta.docs?.find(
      (d: DocEntry) => d.kind === "link" && d.label === "View Trace",
    );
    expect(link).toBeDefined();
    expect((link as Extract<DocEntry, { kind: "link" }>).url).toBe(
      `http://localhost:4848/#trace=${TRACE_ID}`,
    );
  });

  it("still attaches spans without a traceId (no trace meta added)", ({
    task,
  }) => {
    story.init(task);
    story.attachSpans([{ spanId: "aaaa", name: "fetchRates" }]);

    const meta = getStoryMeta(task);
    expect((meta.meta as Record<string, unknown>)?.otel).toBeUndefined();
    expect(
      meta.docs?.some((d: DocEntry) => d.kind === "link"),
    ).toBeFalsy();
    expect((task.meta as { otelSpans?: unknown[] }).otelSpans).toHaveLength(1);
  });
});
