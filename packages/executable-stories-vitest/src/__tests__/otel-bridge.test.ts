/**
 * Tests for the OTel bridge in story.init().
 *
 * Verifies bidirectional data flow:
 * - OTel -> Story: traceId/spanId captured into meta + doc entries
 * - Story -> OTel: story attributes set on the active span
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock span that tracks setAttribute calls
const mockSetAttribute = vi.fn();
const mockSpan = {
  spanContext: () => ({
    traceId: "abc123abc123abc123abc123abc123ab",
    spanId: "def456def456def4",
  }),
  setAttribute: mockSetAttribute,
};

const mockOtelApi = {
  trace: { getActiveSpan: () => mockSpan },
};

// Mock node:module so createRequire returns our mock OTel API
vi.mock("node:module", () => ({
  createRequire: () => (id: string) => {
    if (id === "@opentelemetry/api") return mockOtelApi;
    throw new Error(`Unexpected require: ${id}`);
  },
}));

// Mock tryGetActiveOtelContext from formatters to return our test context
vi.mock("executable-stories-formatters", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    tryGetActiveOtelContext: () => ({
      traceId: "abc123abc123abc123abc123abc123ab",
      spanId: "def456def456def4",
    }),
  };
});

import { story } from "../story-api";
import type { StoryMeta, DocEntry } from "../types";

function getStoryMeta(task: { meta: object }): StoryMeta {
  return (task.meta as { story: StoryMeta }).story;
}

describe("otel bridge", () => {
  beforeEach(() => {
    mockSetAttribute.mockClear();
    delete process.env.OTEL_TRACE_URL_TEMPLATE;
  });

  it("captures trace context into meta + docs", ({ task }) => {
    story.init(task, { tags: ["admin"] });

    const meta = getStoryMeta(task);
    const otel = (meta.meta as Record<string, unknown>)?.otel as {
      traceId: string;
      spanId: string;
    };
    expect(otel.traceId).toBe("abc123abc123abc123abc123abc123ab");
    expect(otel.spanId).toBe("def456def456def4");

    const kv = meta.docs?.find(
      (d: DocEntry) => d.kind === "kv" && d.label === "Trace ID",
    );
    expect(kv).toBeDefined();
    expect((kv as Extract<DocEntry, { kind: "kv" }>).value).toBe(
      "abc123abc123abc123abc123abc123ab",
    );
  });

  it("adds trace link when OTEL_TRACE_URL_TEMPLATE is set", ({ task }) => {
    process.env.OTEL_TRACE_URL_TEMPLATE =
      "https://grafana.example.com/explore?traceId={traceId}";
    story.init(task);

    const meta = getStoryMeta(task);
    const link = meta.docs?.find(
      (d: DocEntry) => d.kind === "link" && d.label === "View Trace",
    ) as Extract<DocEntry, { kind: "link" }> | undefined;
    expect(link).toBeDefined();
    expect(link!.url).toBe(
      "https://grafana.example.com/explore?traceId=abc123abc123abc123abc123abc123ab",
    );
  });

  it("adds trace link from traceUrlTemplate option", ({ task }) => {
    story.init(task, {
      traceUrlTemplate: "https://jaeger.example.com/trace/{traceId}",
    });

    const meta = getStoryMeta(task);
    const link = meta.docs?.find(
      (d: DocEntry) => d.kind === "link" && d.label === "View Trace",
    ) as Extract<DocEntry, { kind: "link" }> | undefined;
    expect(link).toBeDefined();
    expect(link!.url).toBe(
      "https://jaeger.example.com/trace/abc123abc123abc123abc123abc123ab",
    );
  });

  it("prefers traceUrlTemplate option over OTEL_TRACE_URL_TEMPLATE", ({ task }) => {
    process.env.OTEL_TRACE_URL_TEMPLATE =
      "https://grafana.example.com/explore?traceId={traceId}";

    story.init(task, {
      traceUrlTemplate: "https://jaeger.example.com/trace/{traceId}",
    });

    const meta = getStoryMeta(task);
    const link = meta.docs?.find(
      (d: DocEntry) => d.kind === "link" && d.label === "View Trace",
    ) as Extract<DocEntry, { kind: "link" }> | undefined;

    expect(link).toBeDefined();
    expect(link!.url).toBe(
      "https://jaeger.example.com/trace/abc123abc123abc123abc123abc123ab",
    );
  });

  it("enriches active span with story attributes", ({ task }) => {
    story.init(task, { tags: ["admin"], ticket: ["JIRA-123"] });

    expect(mockSetAttribute).toHaveBeenCalledWith(
      "story.scenario",
      task.name,
    );
    expect(mockSetAttribute).toHaveBeenCalledWith("story.tags", ["admin"]);
    expect(mockSetAttribute).toHaveBeenCalledWith("story.tickets", [
      "JIRA-123",
    ]);
  });
});
