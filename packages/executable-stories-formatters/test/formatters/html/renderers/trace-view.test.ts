/**
 * Unit tests for renderTraceView (fn(args, deps)).
 */

import { describe, it, expect } from "vitest";
import { renderTraceView } from "../../../../src/formatters/html/renderers/trace-view";
import type { OtelSpan } from "../../../../src/types/otel";

const deps = { escapeHtml: (s: string) => s };

function escapeHtmlReal(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeSpan(overrides: Partial<OtelSpan> = {}): OtelSpan {
  return {
    spanId: "span-1",
    name: "test-span",
    startTimeMs: 0,
    durationMs: 100,
    status: "ok",
    ...overrides,
  };
}

describe("renderTraceView", () => {
  it("returns empty string for undefined spans", () => {
    expect(renderTraceView({ spans: undefined }, deps)).toBe("");
  });

  it("returns empty string for empty spans array", () => {
    expect(renderTraceView({ spans: [] }, deps)).toBe("");
  });

  it("renders single span with correct bar positioning", () => {
    const html = renderTraceView(
      { spans: [makeSpan()] },
      deps,
    );
    expect(html).toContain('class="trace-view collapsed"');
    expect(html).toContain("left: 0.00%");
    expect(html).toContain("width: 100.00%");
    expect(html).toContain("test-span");
  });

  it("renders parent-child hierarchy with depth-based indentation", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "root", name: "root-span", startTimeMs: 0, durationMs: 200 }),
      makeSpan({ spanId: "child", parentSpanId: "root", name: "child-span", startTimeMs: 50, durationMs: 100 }),
    ];
    const html = renderTraceView({ spans }, deps);
    expect(html).toContain('padding-left: 0px');
    expect(html).toContain('padding-left: 16px');
  });

  it("sorts children by startTimeMs within parent", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "root", name: "root", startTimeMs: 0, durationMs: 300 }),
      makeSpan({ spanId: "b", parentSpanId: "root", name: "second", startTimeMs: 100, durationMs: 50 }),
      makeSpan({ spanId: "a", parentSpanId: "root", name: "first", startTimeMs: 50, durationMs: 50 }),
    ];
    const html = renderTraceView({ spans }, deps);
    const firstIdx = html.indexOf("first");
    const secondIdx = html.indexOf("second");
    expect(firstIdx).toBeLessThan(secondIdx);
  });

  it("sorts multiple roots by startTimeMs", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "b", name: "later", startTimeMs: 100, durationMs: 50 }),
      makeSpan({ spanId: "a", name: "earlier", startTimeMs: 0, durationMs: 50 }),
    ];
    const html = renderTraceView({ spans }, deps);
    const earlierIdx = html.indexOf("earlier");
    const laterIdx = html.indexOf("later");
    expect(earlierIdx).toBeLessThan(laterIdx);
  });

  it("does not drop spans when spanId values are duplicated", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "dup", name: "first-dup", startTimeMs: 0, durationMs: 100 }),
      makeSpan({ spanId: "dup", name: "second-dup", startTimeMs: 120, durationMs: 50, status: "error" }),
    ];
    const html = renderTraceView({ spans }, deps);
    expect(html).toContain("first-dup");
    expect(html).toContain("second-dup");
    expect(html).toContain('class="trace-view-count">2<');
  });

  it("renders time axis from 0ms to total duration", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "a", startTimeMs: 1000, durationMs: 500 }),
    ];
    const html = renderTraceView({ spans }, deps);
    expect(html).toContain(">0ms<");
    expect(html).toContain(">500.0ms<");
  });

  it("renders status classes on dot and bar", () => {
    const html = renderTraceView(
      { spans: [makeSpan({ status: "error" })] },
      deps,
    );
    expect(html).toContain("trace-view-status-error");
    expect(html).toContain("trace-view-bar-error");
  });

  it("renders unset status class", () => {
    const html = renderTraceView(
      { spans: [makeSpan({ status: "unset" })] },
      deps,
    );
    expect(html).toContain("trace-view-status-unset");
    expect(html).toContain("trace-view-bar-unset");
  });

  it("does not allow status value to inject attributes into HTML", () => {
    const html = renderTraceView(
      {
        spans: [
          makeSpan({
            status: 'ok" onclick="alert(1)' as unknown as OtelSpan["status"],
          }),
        ],
      },
      deps,
    );
    expect(html).not.toContain('onclick="alert(1)"');
    expect(html).toContain("trace-view-status-unset");
    expect(html).toContain("trace-view-bar-unset");
  });

  it("includes attributes in tooltip", () => {
    const html = renderTraceView(
      {
        spans: [
          makeSpan({
            attributes: { "http.method": "GET", "http.url": "/api" },
          }),
        ],
      },
      deps,
    );
    expect(html).toContain("http.method=GET");
    expect(html).toContain("http.url=/api");
  });

  it("formats array attribute values in tooltip", () => {
    const html = renderTraceView(
      {
        spans: [
          makeSpan({
            attributes: { tags: ["a", "b", "c"] },
          }),
        ],
      },
      deps,
    );
    expect(html).toContain("tags=[a, b, c]");
  });

  it("escapes HTML in span names", () => {
    const html = renderTraceView(
      { spans: [makeSpan({ name: '<script>alert("xss")</script>' })] },
      { escapeHtml: escapeHtmlReal },
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders zero-duration span with min-width 0.5%", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "a", startTimeMs: 0, durationMs: 100 }),
      makeSpan({ spanId: "b", startTimeMs: 50, durationMs: 0 }),
    ];
    const html = renderTraceView({ spans }, deps);
    expect(html).toContain("width: 0.50%");
  });

  it("keeps zero-duration span visible when it starts at trace end", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "a", name: "root", startTimeMs: 0, durationMs: 100 }),
      makeSpan({ spanId: "b", name: "edge", startTimeMs: 100, durationMs: 0 }),
    ];
    const html = renderTraceView({ spans }, deps);
    expect(html).toContain("edge");
    expect(html).not.toContain("left: 100.00%; width: 0.00%");
  });

  it("normalizes nanosecond input to milliseconds", () => {
    const spans: OtelSpan[] = [
      {
        spanId: "nano",
        name: "nano-span",
        startTimeUnixNano: 1_000_000_000_000,
        endTimeUnixNano: 1_000_000_500_000,
        status: "ok",
      },
    ];
    const html = renderTraceView({ spans }, deps);
    expect(html).toContain("nano-span");
    expect(html).toContain("0.5ms");
  });

  it("handles mixed input: some spans with ms, some with nanos", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "ms", name: "ms-span", startTimeMs: 0, durationMs: 100 }),
      {
        spanId: "nano",
        name: "nano-span",
        startTimeUnixNano: 50_000_000,
        endTimeUnixNano: 80_000_000,
        status: "ok",
      },
    ];
    const html = renderTraceView({ spans }, deps);
    expect(html).toContain("ms-span");
    expect(html).toContain("nano-span");
  });

  it("handles large epoch times with relative normalization", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "a", startTimeMs: 1700000000000, durationMs: 100 }),
      makeSpan({ spanId: "b", startTimeMs: 1700000000050, durationMs: 50 }),
    ];
    const html = renderTraceView({ spans }, deps);
    // Should not produce NaN or Infinity
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
    expect(html).toContain("left: 0.00%");
  });

  it("treats child with missing parent as root", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "orphan", parentSpanId: "nonexistent", name: "orphan-span" }),
    ];
    const html = renderTraceView({ spans }, deps);
    expect(html).toContain("orphan-span");
    expect(html).toContain('padding-left: 0px');
  });

  it("handles self-referencing span without infinite loop", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "self", parentSpanId: "self", name: "self-ref" }),
    ];
    const html = renderTraceView({ spans }, deps);
    expect(html).toContain("self-ref");
  });

  it("handles cyclic parent relationships without dropping all spans", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "a", parentSpanId: "b", name: "span-a", startTimeMs: 0, durationMs: 100 }),
      makeSpan({ spanId: "b", parentSpanId: "a", name: "span-b", startTimeMs: 25, durationMs: 50 }),
    ];
    const html = renderTraceView({ spans }, deps);
    expect(html).toContain("span-a");
    expect(html).toContain("span-b");
    expect(html).not.toContain("-Infinity");
    expect(html).toContain('class="trace-view-count">2<');
  });

  it("ignores null and invalid entries in spans payload", () => {
    const html = renderTraceView(
      {
        spans: [
          makeSpan({ spanId: "valid", name: "valid-span", startTimeMs: 0, durationMs: 100 }),
          null,
          { spanId: "missing-name", status: "ok" } as unknown as OtelSpan,
        ] as unknown as OtelSpan[],
      },
      deps,
    );
    expect(html).toContain("valid-span");
    expect(html).not.toContain("missing-name");
  });

  it("truncates large attribute tooltips", () => {
    const longValue = "x".repeat(5000);
    const html = renderTraceView(
      {
        spans: [
          makeSpan({
            attributes: { key: longValue },
          }),
        ],
      },
      deps,
    );
    // Tooltip should be truncated and end with ...
    expect(html).toContain("...");
  });

  it("shows correct span count badge", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "a", startTimeMs: 0, durationMs: 100 }),
      makeSpan({ spanId: "b", startTimeMs: 50, durationMs: 50 }),
      makeSpan({ spanId: "c", startTimeMs: 100, durationMs: 50 }),
    ];
    const html = renderTraceView({ spans }, deps);
    expect(html).toContain('class="trace-view-count">3<');
  });

  it("is collapsed by default", () => {
    const html = renderTraceView(
      { spans: [makeSpan()] },
      deps,
    );
    expect(html).toContain('class="trace-view collapsed"');
    expect(html).toContain('aria-expanded="false"');
  });

  it("handles all spans with zero duration without NaN", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "a", startTimeMs: 100, durationMs: 0 }),
      makeSpan({ spanId: "b", startTimeMs: 100, durationMs: 0 }),
    ];
    const html = renderTraceView({ spans }, deps);
    expect(html).not.toContain("NaN");
    expect(html).toContain("width: 0.50%");
  });

  it("clamps negative duration to 0 and renders with min-width", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "a", startTimeMs: 0, durationMs: 100 }),
      makeSpan({ spanId: "b", startTimeMs: 50, durationMs: -10 }),
    ];
    const html = renderTraceView({ spans }, deps);
    expect(html).not.toContain("NaN");
    // The negative duration is clamped to 0, rendered as min-width
    expect(html).toContain("width: 0.50%");
  });

  it("skips spans with non-finite startTimeMs", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "good", name: "good-span", startTimeMs: 0, durationMs: 100 }),
      makeSpan({ spanId: "bad", name: "bad-span", startTimeMs: NaN, durationMs: 100 }),
    ];
    const html = renderTraceView({ spans }, deps);
    expect(html).toContain("good-span");
    expect(html).not.toContain("bad-span");
    expect(html).toContain('class="trace-view-count">1<');
  });

  it("skips spans with non-finite durationMs", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "good", name: "good-span", startTimeMs: 0, durationMs: 100 }),
      makeSpan({ spanId: "bad", name: "bad-span", startTimeMs: 0, durationMs: Infinity }),
    ];
    const html = renderTraceView({ spans }, deps);
    expect(html).toContain("good-span");
    expect(html).not.toContain("bad-span");
  });

  it("skips spans with insufficient timing data", () => {
    const spans: OtelSpan[] = [
      makeSpan({ spanId: "good", name: "good-span", startTimeMs: 0, durationMs: 100 }),
      { spanId: "bad", name: "bad-span", status: "ok" } as OtelSpan,
    ];
    const html = renderTraceView({ spans }, deps);
    expect(html).toContain("good-span");
    expect(html).not.toContain("bad-span");
  });

  it("includes statusMessage in tooltip", () => {
    const html = renderTraceView(
      {
        spans: [
          makeSpan({ statusMessage: "Deadline exceeded" }),
        ],
      },
      deps,
    );
    expect(html).toContain("Status: Deadline exceeded");
  });

  it("sorts attribute keys alphabetically in tooltip", () => {
    const html = renderTraceView(
      {
        spans: [
          makeSpan({
            attributes: { zebra: "z", alpha: "a", middle: "m" },
          }),
        ],
      },
      deps,
    );
    const alphaIdx = html.indexOf("alpha=a");
    const middleIdx = html.indexOf("middle=m");
    const zebraIdx = html.indexOf("zebra=z");
    expect(alphaIdx).toBeLessThan(middleIdx);
    expect(middleIdx).toBeLessThan(zebraIdx);
  });

  it("formats duration in seconds for values >= 1000ms", () => {
    const html = renderTraceView(
      { spans: [makeSpan({ durationMs: 2500 })] },
      deps,
    );
    expect(html).toContain("2.50s");
  });

  it("returns empty string when all spans have insufficient data", () => {
    const spans: OtelSpan[] = [
      { spanId: "a", name: "no-timing", status: "ok" } as OtelSpan,
    ];
    expect(renderTraceView({ spans }, deps)).toBe("");
  });
});
