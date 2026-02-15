/**
 * No-dependency ANSI escape sequence stripper.
 */

/** Strip ANSI escape sequences. Regex: \x1B\[[0-?]*[ -/]*[@-~] */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}
