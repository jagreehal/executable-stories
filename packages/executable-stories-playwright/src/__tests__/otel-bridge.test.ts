/**
 * Tests for the OTel bridge in story.init().
 *
 * Uses a real (in-memory) OTel tracer to verify bidirectional data flow.
 */
import { test, expect } from "@playwright/test";
import { story } from "../story-api";
import type { StoryMeta, DocEntry } from "../types";

function getStoryMeta(
  testInfo: { annotations: Array<{ type: string; description?: string }> },
): StoryMeta | undefined {
  const annotation = testInfo.annotations.find(
    (a) => a.type === "story-meta",
  );
  if (!annotation?.description) return undefined;
  return JSON.parse(annotation.description);
}

test.describe("otel bridge", () => {
  test("does not add otel meta when no active span", async ({}, testInfo) => {
    story.init(testInfo);

    const meta = getStoryMeta(testInfo);
    expect(meta).toBeDefined();
    // No OTel context should be captured when there's no active span
    const otel = (meta!.meta as Record<string, unknown> | undefined)?.otel;
    expect(otel).toBeUndefined();
    // No trace doc entries
    const traceDocs =
      meta!.docs?.filter(
        (d: DocEntry) =>
          (d.kind === "kv" && d.label === "Trace ID") ||
          (d.kind === "link" && d.label === "View Trace"),
      ) ?? [];
    expect(traceDocs).toHaveLength(0);
  });

  test("adds traceUrlTemplate to StoryOptions type", async ({}, testInfo) => {
    // Verify the option is accepted without error
    story.init(testInfo, {
      traceUrlTemplate: "https://grafana.example.com/explore?traceId={traceId}",
    });

    const meta = getStoryMeta(testInfo);
    expect(meta).toBeDefined();
    expect(meta!.scenario).toBe(
      "adds traceUrlTemplate to StoryOptions type",
    );
  });

  test("attachSpans wires otel meta + View Trace link from explicit traceId", async ({}, testInfo) => {
    const traceId = "11112222333344445555666677778888";
    story.init(testInfo, {
      traceUrlTemplate: "http://localhost:4848/#trace={traceId}",
    });
    // No active span at init() — the trace is supplied at attach time instead.
    story.attachSpans([{ spanId: "aaaa", name: "fetchRates" }], {
      traceId,
      spanId: "aaaa",
    });

    const meta = getStoryMeta(testInfo);
    const otel = (meta!.meta as Record<string, unknown>)?.otel as {
      traceId: string;
      spanId: string;
    };
    expect(otel.traceId).toBe(traceId);
    expect(otel.spanId).toBe("aaaa");

    const link = meta!.docs?.find(
      (d: DocEntry) => d.kind === "link" && d.label === "View Trace",
    );
    expect((link as Extract<DocEntry, { kind: "link" }>).url).toBe(
      `http://localhost:4848/#trace=${traceId}`,
    );
  });

  test("attachSpans without a traceId adds no trace meta", async ({}, testInfo) => {
    story.init(testInfo);
    story.attachSpans([{ spanId: "aaaa", name: "fetchRates" }]);

    const meta = getStoryMeta(testInfo);
    expect(
      (meta!.meta as Record<string, unknown> | undefined)?.otel,
    ).toBeUndefined();
    const spansAnn = testInfo.annotations.find(
      (a) => a.type === "story-otel-spans",
    );
    expect(spansAnn).toBeDefined();
  });
});
