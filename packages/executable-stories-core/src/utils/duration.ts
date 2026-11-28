/**
 * Duration formatting utilities.
 */

/**
 * Format milliseconds as human-readable duration.
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "26 µs", "123 ms", "1.5 s", "2m 30s")
 */
export function formatDuration(ms: number): string {
  // Under a millisecond, microseconds: an in-process span reads "26 µs", not "0 ms".
  const micros = Math.round(ms * 1000);
  if (ms > 0 && micros < 1000) {
    return `${Math.max(1, micros)} µs`;
  }

  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }

  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)} s`;
  }

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

/**
 * Convert milliseconds to nanoseconds.
 *
 * Used for Cucumber JSON format which expects nanoseconds.
 *
 * @param ms - Duration in milliseconds
 * @returns Duration in nanoseconds
 */
export function msToNanoseconds(ms: number): number {
  return Math.round(ms * 1_000_000);
}

/**
 * Convert nanoseconds to milliseconds.
 *
 * @param ns - Duration in nanoseconds
 * @returns Duration in milliseconds
 */
export function nanosecondsToMs(ns: number): number {
  return ns / 1_000_000;
}
