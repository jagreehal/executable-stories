import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendNotifications } from "../../src/notifiers/send-notifications";
import type { TestRunResult } from "executable-stories-core/types/test-result";
import type { CIInfo } from "executable-stories-core/types/ci";

function createRun(overrides: Partial<TestRunResult> = {}): TestRunResult {
  return {
    testCases: [
      {
        id: "tc-1",
        story: {
          scenario: "Test passes",
          steps: [{ keyword: "Given", text: "something" }],
          tags: [],
          suitePath: [],
          sourceOrder: 1,
        },
        sourceFile: "test.ts",
        sourceLine: 1,
        status: "passed",
        durationMs: 100,
        attachments: [],
        stepResults: [{ index: 0, status: "passed", durationMs: 100 }],
        titlePath: [],
        retry: 0,
        retries: 0,
        tags: [],
      },
    ],
    startedAtMs: 1000,
    finishedAtMs: 2000,
    durationMs: 1000,
    projectRoot: "/project",
    runId: "run-1",
    ...overrides,
  };
}

function createFailedRun(): TestRunResult {
  return createRun({
    testCases: [
      {
        id: "tc-1",
        story: {
          scenario: "Test fails",
          steps: [{ keyword: "Given", text: "something" }],
          tags: [],
          suitePath: [],
          sourceOrder: 1,
        },
        sourceFile: "test.ts",
        sourceLine: 1,
        status: "failed",
        durationMs: 100,
        errorMessage: "Expected true to be false",
        attachments: [],
        stepResults: [{ index: 0, status: "failed", durationMs: 100, errorMessage: "Expected true to be false" }],
        titlePath: [],
        retry: 0,
        retries: 0,
        tags: [],
      },
    ],
  });
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

function createMockToCIInfo() {
  return vi.fn((raw?: unknown): CIInfo | undefined => {
    if (!raw) return undefined;
    return {
      provider: raw.provider ?? "unknown",
      displayName: raw.name ?? "CI",
      url: raw.url,
      buildNumber: raw.buildNumber,
      branch: raw.branch,
      commitSha: raw.commitSha,
      prNumber: raw.prNumber,
    };
  });
}

describe("sendNotifications", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("skips all notifications when condition is 'never'", async () => {
    const mockFetch = createMockFetch();
    await sendNotifications(
      {
        run: createRun(),
        notification: {
          condition: "never",
          slackWebhookUrl: "https://hooks.slack.com/services/test",
          teamsWebhookUrl: "https://teams.webhook.example/test",
        },
      },
      { fetch: mockFetch, logger: createMockLogger(), toCIInfo: createMockToCIInfo() },
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips notifications when condition is 'on-failure' and no failures", async () => {
    const mockFetch = createMockFetch();
    await sendNotifications(
      {
        run: createRun(),
        notification: {
          condition: "on-failure",
          slackWebhookUrl: "https://hooks.slack.com/services/test",
        },
      },
      { fetch: mockFetch, logger: createMockLogger(), toCIInfo: createMockToCIInfo() },
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends notifications when condition is 'on-failure' and there are failures", async () => {
    const mockFetch = createMockFetch();
    await sendNotifications(
      {
        run: createFailedRun(),
        notification: {
          condition: "on-failure",
          slackWebhookUrl: "https://hooks.slack.com/services/test",
        },
      },
      { fetch: mockFetch, logger: createMockLogger(), toCIInfo: createMockToCIInfo() },
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("sends notifications when condition is 'always' even with no failures", async () => {
    const mockFetch = createMockFetch();
    await sendNotifications(
      {
        run: createRun(),
        notification: {
          condition: "always",
          slackWebhookUrl: "https://hooks.slack.com/services/test",
        },
      },
      { fetch: mockFetch, logger: createMockLogger(), toCIInfo: createMockToCIInfo() },
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("sends to both Slack and Teams when both configured", async () => {
    const mockFetch = createMockFetch();
    await sendNotifications(
      {
        run: createRun(),
        notification: {
          condition: "always",
          slackWebhookUrl: "https://hooks.slack.com/services/test",
          teamsWebhookUrl: "https://teams.webhook.example/test",
        },
      },
      { fetch: mockFetch, logger: createMockLogger(), toCIInfo: createMockToCIInfo() },
    );
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not send when no webhook URLs configured", async () => {
    const mockFetch = createMockFetch();
    await sendNotifications(
      {
        run: createRun(),
        notification: {
          condition: "always",
        },
      },
      { fetch: mockFetch, logger: createMockLogger(), toCIInfo: createMockToCIInfo() },
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("logs warning with notifier name and HTTP status on error, never URL", async () => {
    const mockFetch = createMockFetch(500, "Internal Server Error");
    const logger = createMockLogger();
    await sendNotifications(
      {
        run: createFailedRun(),
        notification: {
          condition: "on-failure",
          slackWebhookUrl: "https://hooks.slack.com/services/SECRET",
        },
      },
      { fetch: mockFetch, logger, toCIInfo: createMockToCIInfo() },
    );

    expect(logger.warn).toHaveBeenCalled();
    const warnMsg = logger.warn.mock.calls[0][0];
    expect(warnMsg).toContain("Slack");
    expect(warnMsg).toContain("500");
    // Must NOT contain the webhook URL
    expect(warnMsg).not.toContain("SECRET");
    expect(warnMsg).not.toContain("hooks.slack.com");
  });

  it("includes x-request-id in error log when present in response", async () => {
    const mockFetch = createMockFetch(503, "Service Unavailable", { "x-request-id": "req-abc-123" });
    const logger = createMockLogger();
    await sendNotifications(
      {
        run: createFailedRun(),
        notification: {
          condition: "on-failure",
          teamsWebhookUrl: "https://teams.webhook.example/test",
        },
      },
      { fetch: mockFetch, logger, toCIInfo: createMockToCIInfo() },
    );

    expect(logger.warn).toHaveBeenCalled();
    const warnMsg = logger.warn.mock.calls[0][0];
    expect(warnMsg).toContain("req-abc-123");
  });

  it("never throws even on network error", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const logger = createMockLogger();

    // Should not throw
    await expect(
      sendNotifications(
        {
          run: createFailedRun(),
          notification: {
            condition: "on-failure",
            slackWebhookUrl: "https://hooks.slack.com/services/test",
            teamsWebhookUrl: "https://teams.webhook.example/test",
          },
        },
        { fetch: mockFetch, logger, toCIInfo: createMockToCIInfo() },
      ),
    ).resolves.toBeUndefined();
  });

  it("builds correct summary from TestRunResult", async () => {
    const mockFetch = createMockFetch();
    const run = createRun({
      testCases: [
        {
          id: "tc-1",
          story: { scenario: "Pass test", steps: [], tags: [], suitePath: [], sourceOrder: 1 },
          sourceFile: "test.ts",
          sourceLine: 1,
          status: "passed",
          durationMs: 50,
          attachments: [],
          stepResults: [],
          titlePath: [],
          retry: 0,
          retries: 0,
          tags: [],
        },
        {
          id: "tc-2",
          story: { scenario: "Fail test", steps: [], tags: [], suitePath: [], sourceOrder: 2 },
          sourceFile: "test.ts",
          sourceLine: 10,
          status: "failed",
          durationMs: 50,
          errorMessage: "oops",
          attachments: [],
          stepResults: [],
          titlePath: [],
          retry: 0,
          retries: 0,
          tags: [],
        },
        {
          id: "tc-3",
          story: { scenario: "Skip test", steps: [], tags: [], suitePath: [], sourceOrder: 3 },
          sourceFile: "test.ts",
          sourceLine: 20,
          status: "skipped",
          durationMs: 0,
          attachments: [],
          stepResults: [],
          titlePath: [],
          retry: 0,
          retries: 0,
          tags: [],
        },
      ],
      durationMs: 100,
    });

    await sendNotifications(
      {
        run,
        notification: {
          condition: "always",
          slackWebhookUrl: "https://hooks.slack.com/services/test",
          reportUrl: "https://example.com/report",
        },
      },
      { fetch: mockFetch, logger: createMockLogger(), toCIInfo: createMockToCIInfo() },
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);

    // Check header contains correct counts
    const headerText = body.blocks[0].text.text;
    expect(headerText).toContain("1 passed");
    expect(headerText).toContain("1 failed");
  });

  it("passes reportUrl through to notifier payload", async () => {
    const mockFetch = createMockFetch();
    await sendNotifications(
      {
        run: createRun(),
        notification: {
          condition: "always",
          slackWebhookUrl: "https://hooks.slack.com/services/test",
          reportUrl: "https://example.com/my-report",
        },
      },
      { fetch: mockFetch, logger: createMockLogger(), toCIInfo: createMockToCIInfo() },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const actionsBlock = body.blocks.find((b: { type?: string }) => b.type === "actions");
    expect(actionsBlock).toBeDefined();
    expect(actionsBlock.elements[0].url).toBe("https://example.com/my-report");
  });

  // --- New tests for generic webhook dispatch ---

  it("dispatches generic webhook alongside Slack and Teams", async () => {
    const mockFetch = createMockFetch();
    await sendNotifications(
      {
        run: createFailedRun(),
        notification: {
          condition: "on-failure",
          slackWebhookUrl: "https://hooks.slack.com/services/test",
          teamsWebhookUrl: "https://teams.webhook.example/test",
          webhooks: [{ url: "https://webhook.example.com/hook1" }],
        },
      },
      { fetch: mockFetch, logger: createMockLogger(), toCIInfo: createMockToCIInfo() },
    );
    // Slack + Teams + 1 generic webhook = 3
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("per-webhook condition override works", async () => {
    const mockFetch = createMockFetch();
    await sendNotifications(
      {
        run: createRun(), // all passing
        notification: {
          condition: "on-failure", // global: skip because no failures
          webhooks: [
            { url: "https://webhook.example.com/always", condition: "always" },
            { url: "https://webhook.example.com/on-failure" }, // inherits global
          ],
        },
      },
      { fetch: mockFetch, logger: createMockLogger(), toCIInfo: createMockToCIInfo() },
    );
    // Only the "always" webhook should fire
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("webhook skipped when its condition doesn't match", async () => {
    const mockFetch = createMockFetch();
    await sendNotifications(
      {
        run: createRun(), // all passing
        notification: {
          condition: "always",
          webhooks: [
            { url: "https://webhook.example.com/never", condition: "never" },
          ],
        },
      },
      { fetch: mockFetch, logger: createMockLogger(), toCIInfo: createMockToCIInfo() },
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("missing fetch logs warning and does not crash", async () => {
    const logger = createMockLogger();
    await sendNotifications(
      {
        run: createFailedRun(),
        notification: {
          condition: "on-failure",
          slackWebhookUrl: "https://hooks.slack.com/services/test",
        },
      },
      { fetch: undefined, logger, toCIInfo: createMockToCIInfo() },
    );
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toContain("fetch unavailable");
  });

  it("env fallback: uses SLACK_WEBHOOK_URL when slackWebhookUrl not provided", async () => {
    const mockFetch = createMockFetch();
    await sendNotifications(
      {
        run: createFailedRun(),
        notification: {
          condition: "on-failure",
        },
      },
      {
        fetch: mockFetch,
        logger: createMockLogger(),
        toCIInfo: createMockToCIInfo(),
        env: { SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/env-test" },
      },
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // Verify the URL passed to fetch is the env var value
    expect(mockFetch.mock.calls[0][0]).toBe("https://hooks.slack.com/services/env-test");
  });

  it("env fallback: uses TEAMS_WEBHOOK_URL when teamsWebhookUrl not provided", async () => {
    const mockFetch = createMockFetch();
    await sendNotifications(
      {
        run: createFailedRun(),
        notification: {
          condition: "on-failure",
        },
      },
      {
        fetch: mockFetch,
        logger: createMockLogger(),
        toCIInfo: createMockToCIInfo(),
        env: { TEAMS_WEBHOOK_URL: "https://teams.webhook.example/env-test" },
      },
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe("https://teams.webhook.example/env-test");
  });

  it("defaults condition to 'on-failure' when not specified", async () => {
    const mockFetch = createMockFetch();
    // Passing run → on-failure should skip
    await sendNotifications(
      {
        run: createRun(),
        notification: {
          slackWebhookUrl: "https://hooks.slack.com/services/test",
        },
      },
      { fetch: mockFetch, logger: createMockLogger(), toCIInfo: createMockToCIInfo() },
    );
    expect(mockFetch).not.toHaveBeenCalled();

    // Failed run → on-failure should send
    await sendNotifications(
      {
        run: createFailedRun(),
        notification: {
          slackWebhookUrl: "https://hooks.slack.com/services/test",
        },
      },
      { fetch: mockFetch, logger: createMockLogger(), toCIInfo: createMockToCIInfo() },
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not send when notification is undefined", async () => {
    const mockFetch = createMockFetch();
    await sendNotifications(
      { run: createRun() },
      { fetch: mockFetch, logger: createMockLogger(), toCIInfo: createMockToCIInfo() },
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
