import { describe, it, expect, vi } from "vitest";
import { sendTeamsNotification } from "../../src/notifiers/teams";
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

describe("sendTeamsNotification", () => {
  it("builds correct Adaptive Card structure", async () => {
    const mockFetch = createMockFetch();
    const summary = createSummary();

    await sendTeamsNotification(
      { summary, webhookUrl: "https://teams.webhook.example/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);

    // Check outer structure
    expect(body.type).toBe("message");
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0].contentType).toBe("application/vnd.microsoft.card.adaptive");

    // Check card structure
    const card = body.attachments[0].content;
    expect(card.type).toBe("AdaptiveCard");
    expect(card.version).toBe("1.4");
    expect(card.$schema).toBe("http://adaptivecards.io/schemas/adaptive-card.json");
    expect(card.body).toBeDefined();
    expect(Array.isArray(card.body)).toBe(true);
  });

  it("includes FactSet with all summary fields", async () => {
    const mockFetch = createMockFetch();
    const summary = createSummary({
      total: 20,
      passed: 15,
      failed: 3,
      skipped: 2,
      durationMs: 12345,
    });

    await sendTeamsNotification(
      { summary, webhookUrl: "https://teams.webhook.example/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const card = body.attachments[0].content;
    const factSet = card.body.find((item: any) => item.type === "FactSet" && !item.separator);
    expect(factSet).toBeDefined();

    const factTitles = factSet.facts.map((f: any) => f.title);
    expect(factTitles).toContain("Total");
    expect(factTitles).toContain("Passed");
    expect(factTitles).toContain("Failed");
    expect(factTitles).toContain("Skipped");
    expect(factTitles).toContain("Duration");

    const totalFact = factSet.facts.find((f: any) => f.title === "Total");
    expect(totalFact.value).toBe("20");
  });

  it("lists failures with truncated errors", async () => {
    const mockFetch = createMockFetch();
    const longError = "x".repeat(600);
    const summary = createSummary({
      failed: 2,
      failedTests: [
        { name: "test A", error: longError },
        { name: "test B", error: "short error" },
      ],
    });

    await sendTeamsNotification(
      { summary, webhookUrl: "https://teams.webhook.example/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const card = body.attachments[0].content;
    const container = card.body.find((item: any) => item.type === "Container");
    expect(container).toBeDefined();

    // Find error TextBlock for test A
    const errorBlocks = container.items.filter(
      (item: any) => item.fontType === "Monospace",
    );
    expect(errorBlocks).toHaveLength(2);
    // First error should be truncated
    expect(errorBlocks[0].text.length).toBeLessThanOrEqual(500);
    expect(errorBlocks[0].text).toContain("...");
    // Second error should be as-is
    expect(errorBlocks[1].text).toBe("short error");
  });

  it("strips ANSI codes from error text", async () => {
    const mockFetch = createMockFetch();
    const summary = createSummary({
      failed: 1,
      failedTests: [
        { name: "test", error: "\x1B[31mError\x1B[0m: bad thing" },
      ],
    });

    await sendTeamsNotification(
      { summary, webhookUrl: "https://teams.webhook.example/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const raw = mockFetch.mock.calls[0][1].body;
    expect(raw).not.toContain("\x1B");
    expect(raw).toContain("Error: bad thing");
  });

  it("shows CI info when present", async () => {
    const mockFetch = createMockFetch();
    const ci = createCIInfo({ branch: "develop", commitSha: "1234567890abcdef" });
    const summary = createSummary({ ci });

    await sendTeamsNotification(
      { summary, webhookUrl: "https://teams.webhook.example/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const card = body.attachments[0].content;
    const ciFactSet = card.body.find(
      (item: any) => item.type === "FactSet" && item.separator === true,
    );
    expect(ciFactSet).toBeDefined();

    const factTitles = ciFactSet.facts.map((f: any) => f.title);
    expect(factTitles).toContain("Branch");
    expect(factTitles).toContain("Commit");

    const branchFact = ciFactSet.facts.find((f: any) => f.title === "Branch");
    expect(branchFact.value).toBe("develop");

    const commitFact = ciFactSet.facts.find((f: any) => f.title === "Commit");
    expect(commitFact.value).toBe("1234567");
  });

  it("includes View Report action when reportUrl given", async () => {
    const mockFetch = createMockFetch();
    const summary = createSummary({ reportUrl: "https://example.com/report" });

    await sendTeamsNotification(
      { summary, webhookUrl: "https://teams.webhook.example/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const card = body.attachments[0].content;
    expect(card.actions).toBeDefined();
    expect(card.actions).toHaveLength(1);
    expect(card.actions[0].type).toBe("Action.OpenUrl");
    expect(card.actions[0].title).toBe("View Report");
    expect(card.actions[0].url).toBe("https://example.com/report");
  });

  it("does not include actions when no reportUrl", async () => {
    const mockFetch = createMockFetch();
    const summary = createSummary({ reportUrl: undefined });

    await sendTeamsNotification(
      { summary, webhookUrl: "https://teams.webhook.example/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const card = body.attachments[0].content;
    expect(card.actions).toBeUndefined();
  });

  it("caps failed tests list by maxFailedTests", async () => {
    const mockFetch = createMockFetch();
    const failedTests = Array.from({ length: 8 }, (_, i) => ({
      name: `test ${i + 1}`,
      error: `error ${i + 1}`,
    }));
    const summary = createSummary({ failed: 8, failedTests });

    await sendTeamsNotification(
      { summary, webhookUrl: "https://teams.webhook.example/test", maxFailedTests: 2 },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const card = body.attachments[0].content;
    const container = card.body.find((item: any) => item.type === "Container");

    // Should have: "Failed Tests" header + test1 name + test1 error + test2 name + test2 error + "...and 6 more"
    const nameBlocks = container.items.filter(
      (item: any) => item.text?.startsWith("**test"),
    );
    expect(nameBlocks).toHaveLength(2);

    const moreBlock = container.items.find(
      (item: any) => item.isSubtle === true,
    );
    expect(moreBlock).toBeDefined();
    expect(moreBlock.text).toContain("6 more");
  });

  it("returns ok: true on successful send", async () => {
    const mockFetch = createMockFetch(200);
    const result = await sendTeamsNotification(
      { summary: createSummary(), webhookUrl: "https://teams.webhook.example/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );
    expect(result.ok).toBe(true);
  });

  it("returns ok: false and logs warning on HTTP error", async () => {
    const mockFetch = createMockFetch(400, "Bad Request", { "x-request-id": "req-123" });
    const logger = createMockLogger();
    const result = await sendTeamsNotification(
      { summary: createSummary(), webhookUrl: "https://teams.webhook.example/test" },
      { fetch: mockFetch, logger },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Teams notifier failed");
    expect(result.error).toContain("400");
    expect(result.error).toContain("req-123");
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it("returns ok: false on network error without throwing", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const logger = createMockLogger();
    const result = await sendTeamsNotification(
      { summary: createSummary(), webhookUrl: "https://teams.webhook.example/test" },
      { fetch: mockFetch, logger },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
  });

  it("shows check mark emoji for all-pass header", async () => {
    const mockFetch = createMockFetch();
    const summary = createSummary({ passed: 5, failed: 0 });

    await sendTeamsNotification(
      { summary, webhookUrl: "https://teams.webhook.example/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const card = body.attachments[0].content;
    const header = card.body[0];
    expect(header.text).toContain("\u2705"); // check mark
    expect(header.color).toBe("good");
  });

  it("shows cross mark emoji for failed header", async () => {
    const mockFetch = createMockFetch();
    const summary = createSummary({
      failed: 1,
      failedTests: [{ name: "test", error: "fail" }],
    });

    await sendTeamsNotification(
      { summary, webhookUrl: "https://teams.webhook.example/test" },
      { fetch: mockFetch, logger: createMockLogger() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const card = body.attachments[0].content;
    const header = card.body[0];
    expect(header.text).toContain("\u274C"); // cross mark
    expect(header.color).toBe("attention");
  });
});
