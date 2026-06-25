/**
 * Notification types for webhook integrations (Slack, Teams).
 */

import type { CIInfo } from "executable-stories-core/types/ci";

/** Summary of a test run for notification payloads. */
export interface NotificationSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  failedTests: Array<{ testId?: string; name: string; error?: string }>;
  ci?: CIInfo;
  reportUrl?: string;
}

/** When to send notifications. */
export type NotifyCondition = "always" | "on-failure" | "never";

/** HMAC-SHA256 signing configuration for generic webhooks. */
export interface WebhookSignerHmac {
  type: "hmac-sha256";
  /** Secret key for HMAC computation */
  secret: string;
  /** Request header name for signature, e.g. "X-Signature" */
  header: string;
  /** Include timestamp in signed payload and emit timestamp header? */
  includeTimestamp?: boolean;
  /** Request header name for timestamp (default: "X-Timestamp"). Only emitted when includeTimestamp is true. */
  timestampHeader?: string;
}

/** Configuration for a generic webhook endpoint. */
export interface GenericWebhookNotifierOptions {
  url: string;
  condition?: NotifyCondition;
  method?: "POST" | "PUT";
  headers?: Record<string, string>;
  signer?: WebhookSignerHmac;
}

/** Versioned envelope sent to generic webhooks. */
export interface WebhookPayload {
  schemaVersion: 1;
  event: "test_run_finished";
  summary: NotificationSummary;
}
