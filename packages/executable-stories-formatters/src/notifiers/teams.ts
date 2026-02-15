/**
 * Microsoft Teams webhook notifier using Adaptive Cards.
 *
 * Follows the fn(args, deps) pattern.
 * Never logs the webhook URL.
 */

import type { NotificationSummary } from "./types";
import { stripAnsi } from "./ansi-strip";

/** Arguments for sendTeamsNotification. */
export interface TeamsNotificationArgs {
  summary: NotificationSummary;
  webhookUrl: string;
  maxFailedTests?: number;
}

/** Injectable dependencies for sendTeamsNotification. */
export interface TeamsNotificationDeps {
  fetch: typeof globalThis.fetch;
  logger: { warn(msg: string): void };
}

/** Result of a notification send attempt. */
export interface TeamsNotificationResult {
  ok: boolean;
  error?: string;
}

/** Truncate text to a maximum length, appending ellipsis if needed. */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

/** Format milliseconds as a human-readable duration string. */
function formatDuration(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

/** Build an Adaptive Card payload from a notification summary. */
function buildTeamsPayload(
  summary: NotificationSummary,
  maxFailedTests: number,
): Record<string, unknown> {
  const allPassed = summary.failed === 0;
  const statusEmoji = allPassed ? "\u2705" : "\u274C"; // check mark / cross mark
  const statusColor = allPassed ? "good" : "attention";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bodyItems: any[] = [];

  // Header with status
  bodyItems.push({
    type: "TextBlock",
    size: "Large",
    weight: "Bolder",
    text: `${statusEmoji} Test Results`,
    color: statusColor,
  });

  // FactSet with summary
  bodyItems.push({
    type: "FactSet",
    facts: [
      { title: "Total", value: String(summary.total) },
      { title: "Passed", value: String(summary.passed) },
      { title: "Failed", value: String(summary.failed) },
      { title: "Skipped", value: String(summary.skipped) },
      { title: "Duration", value: formatDuration(summary.durationMs) },
    ],
  });

  // Failed tests container
  if (summary.failedTests.length > 0) {
    const displayedTests = summary.failedTests.slice(0, maxFailedTests);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const failedItems: any[] = [
      {
        type: "TextBlock",
        text: "Failed Tests",
        weight: "Bolder",
        spacing: "Medium",
      },
    ];

    for (const t of displayedTests) {
      failedItems.push({
        type: "TextBlock",
        text: `**${t.name}**`,
        wrap: true,
      });
      if (t.error) {
        const cleanError = truncate(stripAnsi(t.error), 500);
        failedItems.push({
          type: "TextBlock",
          text: cleanError,
          wrap: true,
          fontType: "Monospace",
          size: "Small",
          color: "Attention",
        });
      }
    }

    if (summary.failedTests.length > maxFailedTests) {
      failedItems.push({
        type: "TextBlock",
        text: `...and ${summary.failedTests.length - maxFailedTests} more`,
        isSubtle: true,
        spacing: "Small",
      });
    }

    bodyItems.push({
      type: "Container",
      items: failedItems,
    });
  }

  // CI info facts
  if (summary.ci) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ciFacts: any[] = [];

    if (summary.ci.displayName) {
      ciFacts.push({ title: "CI", value: summary.ci.displayName });
    }
    if (summary.ci.branch) {
      ciFacts.push({ title: "Branch", value: summary.ci.branch });
    }
    if (summary.ci.commitSha) {
      ciFacts.push({ title: "Commit", value: summary.ci.commitSha.slice(0, 7) });
    }
    if (summary.ci.buildNumber) {
      ciFacts.push({ title: "Build", value: `#${summary.ci.buildNumber}` });
    }

    if (ciFacts.length > 0) {
      bodyItems.push({
        type: "FactSet",
        facts: ciFacts,
        separator: true,
      });
    }
  }

  // Build the Adaptive Card
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const card: Record<string, any> = {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.4",
    body: bodyItems,
  };

  // "View Report" action
  if (summary.reportUrl) {
    card.actions = [
      {
        type: "Action.OpenUrl",
        title: "View Report",
        url: summary.reportUrl,
      },
    ];
  }

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: card,
      },
    ],
  };
}

/**
 * Send a Teams notification via incoming webhook.
 *
 * Never throws. Returns `{ ok, error? }`.
 * Never logs the webhook URL.
 */
export async function sendTeamsNotification(
  args: TeamsNotificationArgs,
  deps: TeamsNotificationDeps,
): Promise<TeamsNotificationResult> {
  const { summary, webhookUrl, maxFailedTests = 5 } = args;
  const { fetch, logger } = deps;

  const payload = buildTeamsPayload(summary, maxFailedTests);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const requestId = response.headers.get("x-request-id") ?? undefined;
      let bodyText = "";
      try {
        bodyText = await response.text();
      } catch {
        // ignore body read errors
      }
      const truncatedBody = truncate(bodyText, 200);
      const idPart = requestId ? ` x-request-id=${requestId}` : "";
      const errorMsg = `Teams notifier failed: HTTP ${response.status}${idPart} ${truncatedBody}`;
      logger.warn(errorMsg);
      return { ok: false, error: errorMsg };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const errorMsg = `Teams notifier failed: ${msg}`;
    logger.warn(errorMsg);
    return { ok: false, error: errorMsg };
  }
}
