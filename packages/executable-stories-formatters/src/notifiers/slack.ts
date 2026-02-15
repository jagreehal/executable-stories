/**
 * Slack webhook notifier using Block Kit.
 *
 * Follows the fn(args, deps) pattern.
 * Never logs the webhook URL.
 */

import type { NotificationSummary } from "./types";
import { stripAnsi } from "./ansi-strip";

/** Arguments for sendSlackNotification. */
export interface SlackNotificationArgs {
  summary: NotificationSummary;
  webhookUrl: string;
  maxFailedTests?: number;
}

/** Injectable dependencies for sendSlackNotification. */
export interface SlackNotificationDeps {
  fetch: typeof globalThis.fetch;
  logger: { warn(msg: string): void };
}

/** Result of a notification send attempt. */
export interface NotificationResult {
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

/** Build Slack Block Kit payload from a notification summary. */
function buildSlackPayload(
  summary: NotificationSummary,
  maxFailedTests: number,
): Record<string, unknown> {
  const allPassed = summary.failed === 0;
  const emoji = allPassed ? ":white_check_mark:" : ":x:";
  const statusText = allPassed ? "Passed" : "Failed";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [];

  // Header block
  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: `${emoji} Test Results: ${summary.passed} passed, ${summary.failed} failed`,
      emoji: true,
    },
  });

  // Summary fields section
  blocks.push({
    type: "section",
    fields: [
      { type: "mrkdwn", text: `*Total:* ${summary.total}` },
      { type: "mrkdwn", text: `*Passed:* ${summary.passed}` },
      { type: "mrkdwn", text: `*Failed:* ${summary.failed}` },
      { type: "mrkdwn", text: `*Skipped:* ${summary.skipped}` },
      { type: "mrkdwn", text: `*Duration:* ${formatDuration(summary.durationMs)}` },
      { type: "mrkdwn", text: `*Status:* ${statusText}` },
    ],
  });

  // Failed tests section
  if (summary.failedTests.length > 0) {
    const displayedTests = summary.failedTests.slice(0, maxFailedTests);
    const lines = displayedTests.map((t) => {
      const name = t.name;
      if (t.error) {
        const cleanError = truncate(stripAnsi(t.error), 500);
        return `*${name}*\n\`\`\`${cleanError}\`\`\``;
      }
      return `*${name}*`;
    });

    let text = lines.join("\n\n");
    if (summary.failedTests.length > maxFailedTests) {
      text += `\n\n_...and ${summary.failedTests.length - maxFailedTests} more_`;
    }

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text,
      },
    });
  }

  // CI context block
  if (summary.ci) {
    const elements: Array<{ type: string; text: string }> = [];

    if (summary.ci.displayName) {
      elements.push({ type: "mrkdwn", text: `*CI:* ${summary.ci.displayName}` });
    }
    if (summary.ci.branch) {
      elements.push({ type: "mrkdwn", text: `*Branch:* ${summary.ci.branch}` });
    }
    if (summary.ci.commitSha) {
      elements.push({ type: "mrkdwn", text: `*Commit:* ${summary.ci.commitSha.slice(0, 7)}` });
    }
    if (summary.ci.buildNumber) {
      elements.push({ type: "mrkdwn", text: `*Build:* #${summary.ci.buildNumber}` });
    }

    if (elements.length > 0) {
      blocks.push({
        type: "context",
        elements,
      });
    }
  }

  // Actions block with "View Report" button
  if (summary.reportUrl) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "View Report",
            emoji: true,
          },
          url: summary.reportUrl,
          action_id: "view_report",
        },
      ],
    });
  }

  return { blocks };
}

/**
 * Send a Slack notification via incoming webhook.
 *
 * Never throws. Returns `{ ok, error? }`.
 * Never logs the webhook URL.
 */
export async function sendSlackNotification(
  args: SlackNotificationArgs,
  deps: SlackNotificationDeps,
): Promise<NotificationResult> {
  const { summary, webhookUrl, maxFailedTests = 5 } = args;
  const { fetch, logger } = deps;

  const payload = buildSlackPayload(summary, maxFailedTests);

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
      const errorMsg = `Slack notifier failed: HTTP ${response.status}${idPart} ${truncatedBody}`;
      logger.warn(errorMsg);
      return { ok: false, error: errorMsg };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const errorMsg = `Slack notifier failed: ${msg}`;
    logger.warn(errorMsg);
    return { ok: false, error: errorMsg };
  }
}
