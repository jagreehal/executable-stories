/**
 * HMAC-SHA256 signing for generic webhook payloads.
 *
 * Pure function, isolated for testing.
 * Uses node:crypto — zero new dependencies.
 */

import { createHmac } from "node:crypto";

/** Result of HMAC signing. */
export interface HmacSignResult {
  /** Signature in format "sha256=<hex>" (GitHub-style, widely recognized) */
  signature: string;
  /** ISO 8601 timestamp, only present when includeTimestamp is true */
  timestamp?: string;
}

/**
 * Compute HMAC-SHA256 signature for a request body.
 *
 * When `includeTimestamp` is true, the signed input is `"<timestamp>.<body>"` and the
 * timestamp is returned for the caller to emit as a header.
 */
export function signBody(args: {
  body: string;
  secret: string;
  includeTimestamp?: boolean;
  /** Injectable for deterministic testing */
  timestamp?: string;
}): HmacSignResult {
  let input: string;
  let timestamp: string | undefined;

  if (args.includeTimestamp) {
    timestamp = args.timestamp ?? new Date().toISOString();
    input = `${timestamp}.${args.body}`;
  } else {
    input = args.body;
  }

  const hex = createHmac("sha256", args.secret)
    .update(input, "utf8")
    .digest("hex");

  return {
    signature: `sha256=${hex}`,
    timestamp,
  };
}
