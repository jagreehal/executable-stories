import { describe, it, expect, vi } from "vitest";
import { sendSlackNotification } from "../../src/notifiers/slack";
import type { NotificationSummary } from "../../src/notifiers/types";
import type { CIInfo } from "../../src/types/ci";

function createSummary(overrides: Partial<NotificationSummary> = {}): NotificationSummary {
  return {
    total: 10,
    passed: 10,
    failed: 0,
    skipped: 0,
    durationMs: 5000,
    failedTests: [],
    ...overrides,
  };
}

function createCIInfo(overrides: Partial<CIInfo> = {}): CIInfo {
  return {
    provider: "github",
    displayName: "GitHub Actions",
    branch: "main",
    commitSha: "abc1234567890def",
    buildNumber: "42",
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

describe("sendSlackNotification", () => {
  it("sends green emoji header when all tests pass", async () => {
    const mockFetch = createMockFetch();
    const summary = createSummary({ passed: 10, failed: 0 });

    await sendSlackNotification(
      { summary, webhookUrl: "https://hooks.slack.com/services/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const headerText = body.blocks[0].text.text;
    expect(headerText).toContain(":white_check_mark:");
    expect(headerText).toContain("10 passed");
    expect(headerText).toContain("0 failed");
  });

  it("sends red emoji header when tests fail", async () => {
    const mockFetch = createMockFetch();
    const summary = createSummary({
      passed: 7,
      failed: 3,
      failedTests: [
        { name: "test 1", error: "assertion error" },
        { name: "test 2", error: "timeout" },
        { name: "test 3" },
      ],
    });

    await sendSlackNotification(
      { summary, webhookUrl: "https://hooks.slack.com/services/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const headerText = body.blocks[0].text.text;
    expect(headerText).toContain(":x:");
    expect(headerText).toContain("7 passed");
    expect(headerText).toContain("3 failed");

    // Check failed tests block exists
    const failedBlock = body.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("test 1"),
    );
    expect(failedBlock).toBeDefined();
    expect(failedBlock.text.text).toContain("test 1");
    expect(failedBlock.text.text).toContain("assertion error");
  });

  it("truncates error text to 500 chars", async () => {
    const mockFetch = createMockFetch();
    const longError = "x".repeat(600);
    const summary = createSummary({
      failed: 1,
      failedTests: [{ name: "test 1", error: longError }],
    });

    await sendSlackNotification(
      { summary, webhookUrl: "https://hooks.slack.com/services/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const failedBlock = body.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("test 1"),
    );
    // The error text inside code fences should be truncated to 500 chars (497 + "...")
    const errorInBlock = failedBlock.text.text;
    // Extract content between ``` markers
    const codeMatch = errorInBlock.match(/```(.+?)```/s);
    expect(codeMatch).toBeTruthy();
    expect(codeMatch[1].length).toBeLessThanOrEqual(500);
  });

  it("strips ANSI codes from errors", async () => {
    const mockFetch = createMockFetch();
    const summary = createSummary({
      failed: 1,
      failedTests: [
        { name: "test 1", error: "\x1B[31mExpected\x1B[0m value to be true" },
      ],
    });

    await sendSlackNotification(
      { summary, webhookUrl: "https://hooks.slack.com/services/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("\x1B");
    expect(raw).toContain("Expected value to be true");
  });

  it("produces valid JSON payload under 25KB", async () => {
    const mockFetch = createMockFetch();
    const failedTests = Array.from({ length: 10 }, (_, i) => ({
      name: `test ${i + 1}`,
      error: "x".repeat(500),
    }));
    const summary = createSummary({
      total: 100,
      passed: 90,
      failed: 10,
      failedTests,
      ci: createCIInfo(),
      reportUrl: "https://example.com/report",
    });

    await sendSlackNotification(
      { summary, webhookUrl: "https://hooks.slack.com/services/test", maxFailedTests: 10 },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const bodyStr = mockFetch.mock.calls[0][1].body;
    // Verify it's valid JSON
    expect(() => JSON.parse(bodyStr)).not.toThrow();
    // Check conservative size threshold
    expect(bodyStr.length).toBeLessThan(25_000);
  });

  it("includes CI context block when CI info present", async () => {
    const mockFetch = createMockFetch();
    const ci = createCIInfo({ branch: "feature/test", commitSha: "abcdef1234567890" });
    const summary = createSummary({ ci });

    await sendSlackNotification(
      { summary, webhookUrl: "https://hooks.slack.com/services/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const contextBlock = body.blocks.find((b: any) => b.type === "context");
    expect(contextBlock).toBeDefined();

    const elements = contextBlock.elements.map((e: any) => e.text);
    expect(elements).toContainEqual(expect.stringContaining("feature/test"));
    expect(elements).toContainEqual(expect.stringContaining("abcdef1"));
  });

  it("includes View Report button when reportUrl given", async () => {
    const mockFetch = createMockFetch();
    const summary = createSummary({ reportUrl: "https://example.com/report" });

    await sendSlackNotification(
      { summary, webhookUrl: "https://hooks.slack.com/services/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const actionsBlock = body.blocks.find((b: any) => b.type === "actions");
    expect(actionsBlock).toBeDefined();
    expect(actionsBlock.elements[0].text.text).toBe("View Report");
    expect(actionsBlock.elements[0].url).toBe("https://example.com/report");
  });

  it("caps failed tests list by maxFailedTests", async () => {
    const mockFetch = createMockFetch();
    const failedTests = Array.from({ length: 10 }, (_, i) => ({
      name: `test ${i + 1}`,
      error: `error ${i + 1}`,
    }));
    const summary = createSummary({ failed: 10, failedTests });

    await sendSlackNotification(
      { summary, webhookUrl: "https://hooks.slack.com/services/test", maxFailedTests: 3 },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const failedBlock = body.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("test 1"),
    );
    const text = failedBlock.text.text;

    // Should show first 3 tests
    expect(text).toContain("test 1");
    expect(text).toContain("test 2");
    expect(text).toContain("test 3");
    // Should NOT show test 4
    expect(text).not.toContain("test 4");
    // Should show "and 7 more"
    expect(text).toContain("7 more");
  });

  it("returns ok: true on successful send", async () => {
    const mockFetch = createMockFetch(200);
    const result = await sendSlackNotification(
      { summary: createSummary(), webhookUrl: "https://hooks.slack.com/services/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );
    expect(result.ok).toBe(true);
  });

  it("returns ok: false and logs warning on HTTP error", async () => {
    const mockFetch = createMockFetch(400, "invalid_payload");
    const logger = createMockLogger();
    const result = await sendSlackNotification(
      { summary: createSummary(), webhookUrl: "https://hooks.slack.com/services/test" },
      { fetch: mockFetch, logger },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Slack notifier failed");
    expect(result.error).toContain("400");
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it("returns ok: false on network error without throwing", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const logger = createMockLogger();
    const result = await sendSlackNotification(
      { summary: createSummary(), webhookUrl: "https://hooks.slack.com/services/test" },
      { fetch: mockFetch, logger },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
    expect(logger.warn).toHaveBeenCalled();
  });

  it("does not include actions block when no reportUrl", async () => {
    const mockFetch = createMockFetch();
    const summary = createSummary({ reportUrl: undefined });

    await sendSlackNotification(
      { summary, webhookUrl: "https://hooks.slack.com/services/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const actionsBlock = body.blocks.find((b: any) => b.type === "actions");
    expect(actionsBlock).toBeUndefined();
  });

  it("does not include context block when no CI info", async () => {
    const mockFetch = createMockFetch();
    const summary = createSummary({ ci: undefined });

    await sendSlackNotification(
      { summary, webhookUrl: "https://hooks.slack.com/services/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const contextBlock = body.blocks.find((b: any) => b.type === "context");
    expect(contextBlock).toBeUndefined();
  });
});
