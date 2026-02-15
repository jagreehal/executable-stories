import { describe, it, expect, vi } from "vitest";
import { sendWebhookNotification } from "../../src/notifiers/webhook";
import type { NotificationSummary } from "../../src/notifiers/types";
import type { GenericWebhookNotifierOptions } from "../../src/notifiers/types";

function createSummary(overrides: Partial<NotificationSummary> = {}): NotificationSummary {
  return {
    total: 3,
    passed: 2,
    failed: 1,
    skipped: 0,
    durationMs: 1000,
    failedTests: [{ testId: "tc-1", name: "Test fails", error: "oops" }],
    ...overrides,
  };
}

function createMockFetch(status = 200, body = "ok", headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    text: () => Promise.resolve(body),
  });
}

function createMockLogger() {
  return { warn: vi.fn() };
}

describe("sendWebhookNotification", () => {
  const baseOptions: GenericWebhookNotifierOptions = {
    url: "https://webhook.example.com/test",
  };

  it("sends JSON body with Content-Type: application/json", async () => {
    const mockFetch = createMockFetch();
    await sendWebhookNotification(
      { summary: createSummary(), options: baseOptions },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://webhook.example.com/test");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.method).toBe("POST");
  });

  it("payload has schemaVersion, event, and summary", async () => {
    const mockFetch = createMockFetch();
    const summary = createSummary();
    await sendWebhookNotification(
      { summary, options: baseOptions },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(payload.schemaVersion).toBe(1);
    expect(payload.event).toBe("test_run_finished");
    expect(payload.summary.total).toBe(3);
    expect(payload.summary.passed).toBe(2);
    expect(payload.summary.failed).toBe(1);
  });

  it("custom headers applied, can override Content-Type", async () => {
    const mockFetch = createMockFetch();
    const options: GenericWebhookNotifierOptions = {
      ...baseOptions,
      headers: { "Content-Type": "text/plain", "X-Custom": "value" },
    };
    await sendWebhookNotification(
      { summary: createSummary(), options },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Content-Type"]).toBe("text/plain");
    expect(headers["X-Custom"]).toBe("value");
  });

  it("uses PUT method when configured", async () => {
    const mockFetch = createMockFetch();
    const options: GenericWebhookNotifierOptions = { ...baseOptions, method: "PUT" };
    await sendWebhookNotification(
      { summary: createSummary(), options },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    expect(mockFetch.mock.calls[0][1].method).toBe("PUT");
  });

  it("sets HMAC signature header with sha256=<hex> format", async () => {
    const mockFetch = createMockFetch();
    const options: GenericWebhookNotifierOptions = {
      ...baseOptions,
      signer: { type: "hmac-sha256", secret: "my-secret", header: "X-Signature" },
    };
    await sendWebhookNotification(
      { summary: createSummary(), options },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-Signature"]).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it("emits timestamp header when signer.includeTimestamp is true", async () => {
    const mockFetch = createMockFetch();
    const options: GenericWebhookNotifierOptions = {
      ...baseOptions,
      signer: {
        type: "hmac-sha256",
        secret: "my-secret",
        header: "X-Sig",
        includeTimestamp: true,
        timestampHeader: "X-Time",
      },
    };
    await sendWebhookNotification(
      { summary: createSummary(), options },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-Sig"]).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(headers["X-Time"]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("does not emit timestamp header when includeTimestamp is not set", async () => {
    const mockFetch = createMockFetch();
    const options: GenericWebhookNotifierOptions = {
      ...baseOptions,
      signer: { type: "hmac-sha256", secret: "s", header: "X-Sig" },
    };
    await sendWebhookNotification(
      { summary: createSummary(), options },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-Timestamp"]).toBeUndefined();
  });

  it("HMAC headers override user-supplied values", async () => {
    const mockFetch = createMockFetch();
    const options: GenericWebhookNotifierOptions = {
      ...baseOptions,
      headers: { "X-Signature": "user-value" },
      signer: { type: "hmac-sha256", secret: "s", header: "X-Signature" },
    };
    await sendWebhookNotification(
      { summary: createSummary(), options },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-Signature"]).toMatch(/^sha256=/);
    expect(headers["X-Signature"]).not.toBe("user-value");
  });

  it("body used for signing is the same string sent in fetch", async () => {
    const mockFetch = createMockFetch();
    const options: GenericWebhookNotifierOptions = {
      ...baseOptions,
      signer: { type: "hmac-sha256", secret: "s", header: "X-Sig" },
    };
    const summary = createSummary();
    await sendWebhookNotification(
      { summary, options },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = mockFetch.mock.calls[0][1].body;
    // Body should be valid JSON and contain the summary
    const parsed = JSON.parse(body);
    expect(parsed.summary.total).toBe(summary.total);
  });

  it("does not set signature/timestamp headers when no signer", async () => {
    const mockFetch = createMockFetch();
    await sendWebhookNotification(
      { summary: createSummary(), options: baseOptions },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-Signature"]).toBeUndefined();
    expect(headers["X-Timestamp"]).toBeUndefined();
  });

  it("logs warning on HTTP error with safe response body reading", async () => {
    const mockFetch = createMockFetch(500, "Internal Server Error");
    const logger = createMockLogger();
    const result = await sendWebhookNotification(
      { summary: createSummary(), options: baseOptions },
      { fetch: mockFetch, logger },
    );

    expect(result.ok).toBe(false);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toContain("500");
    expect(logger.warn.mock.calls[0][0]).toContain("Internal Server Error");
    // Must NOT contain webhook URL
    expect(logger.warn.mock.calls[0][0]).not.toContain("webhook.example.com");
  });

  it("never throws on network error", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const logger = createMockLogger();
    const result = await sendWebhookNotification(
      { summary: createSummary(), options: baseOptions },
      { fetch: mockFetch, logger },
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
    expect(logger.warn).toHaveBeenCalled();
  });

  it("success does not produce any log output", async () => {
    const mockFetch = createMockFetch();
    const logger = createMockLogger();
    await sendWebhookNotification(
      { summary: createSummary(), options: baseOptions },
      { fetch: mockFetch, logger },
    );

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("includes x-request-id in error log when present", async () => {
    const mockFetch = createMockFetch(502, "Bad Gateway", { "x-request-id": "req-xyz" });
    const logger = createMockLogger();
    await sendWebhookNotification(
      { summary: createSummary(), options: baseOptions },
      { fetch: mockFetch, logger },
    );

    expect(logger.warn.mock.calls[0][0]).toContain("req-xyz");
  });

  it("handles non-text response body gracefully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => null },
      text: () => Promise.reject(new Error("body not readable")),
    });
    const logger = createMockLogger();
    const result = await sendWebhookNotification(
      { summary: createSummary(), options: baseOptions },
      { fetch: mockFetch, logger },
    );

    expect(result.ok).toBe(false);
    expect(logger.warn).toHaveBeenCalled();
  });

  it("uses default X-Timestamp header name when timestampHeader is not set", async () => {
    const mockFetch = createMockFetch();
    const options: GenericWebhookNotifierOptions = {
      ...baseOptions,
      signer: {
        type: "hmac-sha256",
        secret: "s",
        header: "X-Sig",
        includeTimestamp: true,
      },
    };
    await sendWebhookNotification(
      { summary: createSummary(), options },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-Timestamp"]).toBeDefined();
  });
});
