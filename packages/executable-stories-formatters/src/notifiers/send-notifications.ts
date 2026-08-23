/**
 * Notification orchestrator.
 *
 * Builds a NotificationSummary from a TestRunResult and dispatches
 * to configured notifiers (Slack, Teams, generic webhooks) based on condition.
 *
 * Env fallback and defaults are resolved internally so CLI and reporters
 * behave identically with zero duplication.
 *
 * Follows the fn(args, deps) pattern.
 * Never throws. Never logs webhook URLs.
 */

import type { TestRunResult } from "executable-stories-core/types/test-result";
import type { CIInfo } from "executable-stories-core/types/ci";
import type { RawCIInfo } from "executable-stories-core/types/raw";
import type { NotificationSummary, NotifyCondition, GenericWebhookNotifierOptions } from "./types";
import { sendSlackNotification } from "./slack";
import { sendTeamsNotification } from "./teams";
import { sendWebhookNotification } from "./webhook";

/** Arguments for sendNotifications. */
export interface SendNotificationsArgs {
  run: TestRunResult;
  /** Notification config from FormatterOptions.notification (or CLI-assembled equivalent) */
  notification?: {
    slackWebhookUrl?: string;
    teamsWebhookUrl?: string;
    condition?: NotifyCondition;
    reportUrl?: string;
    maxFailedTests?: number;
    webhooks?: GenericWebhookNotifierOptions[];
  };
}

/** Injectable dependencies for sendNotifications. */
export interface SendNotificationsDeps {
  fetch?: typeof globalThis.fetch;
  logger: { warn(msg: string): void };
  toCIInfo: (raw?: RawCIInfo) => CIInfo | undefined;
  env?: Record<string, string | undefined>;
}

/** Build a NotificationSummary from a TestRunResult. */
function buildSummary(
  run: TestRunResult,
  reportUrl: string | undefined,
  toCIInfo: SendNotificationsDeps["toCIInfo"],
): NotificationSummary {
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  const failedTests: NotificationSummary["failedTests"] = [];

  for (const tc of run.testCases) {
    switch (tc.status) {
      case "passed":
        passed++;
        break;
      case "failed":
        failed++;
        failedTests.push({
          testId: tc.id,
          name: tc.story.scenario,
          error: tc.errorMessage,
        });
        break;
      case "skipped":
      case "pending":
        skipped++;
        break;
    }
  }

  // Derive CI info: use typed CIInfo from run.ci if available
  // run.ci is the legacy CIInfo shape { name, url?, buildNumber? }
  // Cast to RawCIInfo to pass through the converter
  let ci: CIInfo | undefined;
  if (run.ci) {
    ci = toCIInfo(run.ci as unknown as RawCIInfo);
  }

  return {
    total: run.testCases.length,
    passed,
    failed,
    skipped,
    durationMs: run.durationMs,
    failedTests,
    ci,
    reportUrl,
  };
}

/** Check if a notifier should fire given condition and failure count. */
function shouldNotify(condition: NotifyCondition, failedCount: number): boolean {
  if (condition === "never") return false;
  if (condition === "on-failure" && failedCount === 0) return false;
  return true;
}

/**
 * Send notifications to all configured channels.
 *
 * Resolves env fallbacks and defaults internally.
 * Never throws. Logs warnings for failures.
 * Never logs webhook URLs.
 */
export async function sendNotifications(
  args: SendNotificationsArgs,
  deps: SendNotificationsDeps,
): Promise<void> {
  const { run, notification } = args;
  const { logger, toCIInfo } = deps;
  const env = deps.env ?? process.env;

  // Guard: if fetch is unavailable, warn and bail
  if (!deps.fetch) {
    logger.warn("notifications: skipped (fetch unavailable)");
    return;
  }
  const fetch = deps.fetch;

  // Resolve env fallbacks + defaults
  const slackWebhookUrl = notification?.slackWebhookUrl ?? env.SLACK_WEBHOOK_URL;
  const teamsWebhookUrl = notification?.teamsWebhookUrl ?? env.TEAMS_WEBHOOK_URL;
  const globalCondition: NotifyCondition = notification?.condition ?? "on-failure";
  const reportUrl = notification?.reportUrl;
  const maxFailedTests = notification?.maxFailedTests ?? 5;
  const webhooks = notification?.webhooks ?? [];

  // Nothing configured → early return
  if (!slackWebhookUrl && !teamsWebhookUrl && webhooks.length === 0) {
    return;
  }

  const summary = buildSummary(run, reportUrl, toCIInfo);

  // Dispatch to configured notifiers concurrently
  const promises: Promise<void>[] = [];

  if (slackWebhookUrl && shouldNotify(globalCondition, summary.failed)) {
    promises.push(
      sendSlackNotification(
        { summary, webhookUrl: slackWebhookUrl, maxFailedTests },
        { fetch, logger },
      ).then(() => undefined),
    );
  }

  if (teamsWebhookUrl && shouldNotify(globalCondition, summary.failed)) {
    promises.push(
      sendTeamsNotification(
        { summary, webhookUrl: teamsWebhookUrl, maxFailedTests },
        { fetch, logger },
      ).then(() => undefined),
    );
  }

  // Generic webhooks — per-webhook condition override
  for (const webhook of webhooks) {
    const effectiveCondition = webhook.condition ?? globalCondition;
    if (!shouldNotify(effectiveCondition, summary.failed)) continue;

    promises.push(
      sendWebhookNotification(
        { summary, options: webhook, maxFailedTests },
        { fetch, logger },
      ).then(() => undefined),
    );
  }

  // Wait for all, never throw
  await Promise.allSettled(promises);
}
