/**
 * Generic webhook notifier.
 *
 * Sends a versioned JSON envelope to arbitrary HTTP endpoints with optional
 * HMAC-SHA256 signing. Follows the fn(args, deps) pattern.
 *
 * Never throws. Never logs the webhook URL.
 */

import type { NotificationSummary } from "./types";
import type { GenericWebhookNotifierOptions, WebhookPayload } from "./types";
import { signBody } from "./hmac";

/** Arguments for sendWebhookNotification. */
export interface WebhookNotificationArgs {
  summary: NotificationSummary;
  options: GenericWebhookNotifierOptions;
  maxFailedTests?: number;
}

/** Injectable dependencies for sendWebhookNotification. */
export interface WebhookNotificationDeps {
  fetch: typeof globalThis.fetch;
  logger: { warn(msg: string): void };
}

/** Result of a webhook send attempt. */
export interface WebhookNotificationResult {
  ok: boolean;
  error?: string;
}

/**
 * Send a notification to a generic webhook endpoint.
 *
 * Never throws. Returns `{ ok, error? }`.
 * Never logs the webhook URL.
 */
export async function sendWebhookNotification(
  args: WebhookNotificationArgs,
  deps: WebhookNotificationDeps,
): Promise<WebhookNotificationResult> {
  const { summary, options } = args;
  const { fetch, logger } = deps;

  // Build versioned envelope
  const payload: WebhookPayload = {
    schemaVersion: 1,
    event: "test_run_finished",
    summary,
  };
  const body = JSON.stringify(payload);

  // Build headers
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // Apply user-provided headers (can override Content-Type)
  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      headers[key] = value;
    }
  }

  // HMAC signing — headers always override user-supplied values
  if (options.signer) {
    const { secret, header, includeTimestamp, timestampHeader } = options.signer;
    const result = signBody({ body, secret, includeTimestamp });
    headers[header] = result.signature;
    if (result.timestamp) {
      headers[timestampHeader ?? "X-Timestamp"] = result.timestamp;
    }
  }

  try {
    const response = await fetch(options.url, {
      method: options.method ?? "POST",
      headers,
      body,
    });

    if (!response.ok) {
      const requestId = response.headers.get("x-request-id") ?? undefined;
      let snippet = "";
      try {
        snippet = (await response.text()).slice(0, 200);
      } catch {
        /* ignore */
      }
      const idPart = requestId ? ` x-request-id=${requestId}` : "";
      const errorMsg = `webhook: HTTP ${response.status}${idPart} ${snippet}`;
      logger.warn(errorMsg);
      return { ok: false, error: errorMsg };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const errorMsg = `webhook: ${msg}`;
    logger.warn(errorMsg);
    return { ok: false, error: errorMsg };
  }
}
