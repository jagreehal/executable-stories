import { describe, it, expect } from "vitest";
import { resolveTraceUrl } from "../../src/utils/otel-detect";

describe("resolveTraceUrl", () => {
  it("returns undefined when template is undefined", () => {
    expect(resolveTraceUrl(undefined, "abc123")).toBeUndefined();
  });

  it("replaces a single {traceId} placeholder", () => {
    const result = resolveTraceUrl(
      "https://grafana.example.com/explore?traceId={traceId}",
      "abc123",
    );
    expect(result).toBe("https://grafana.example.com/explore?traceId=abc123");
  });

  it("replaces multiple {traceId} placeholders", () => {
    const result = resolveTraceUrl(
      "https://example.com/{traceId}/details?id={traceId}",
      "abc123",
    );
    expect(result).toBe("https://example.com/abc123/details?id=abc123");
  });

  it("returns template unchanged when no placeholder is present", () => {
    const result = resolveTraceUrl("https://example.com/traces", "abc123");
    expect(result).toBe("https://example.com/traces");
  });
});
