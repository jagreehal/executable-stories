/**
 * Expected and actual values from a failed assertion error, as text.
 *
 * Vitest formats values to strings when it builds a diff and leaves them raw
 * otherwise. Jest keeps them raw on `matcherResult`. Pass `preformatted: true`
 * for a host whose strings arrive formatted.
 *
 * Raw values go through `util.inspect`, which keeps `'3'` and `3`, `NaN` and
 * `null`, and Map and Set contents apart. The adapters' Node reporters are the
 * only callers.
 */
import { inspect } from "node:util";

const UNPRINTABLE = "[unprintable value]";

function format(value: unknown, preformatted: boolean): string {
  if (preformatted && typeof value === "string") return value;
  try {
    // Custom inspect hooks and getters stay off so user code never runs here.
    return inspect(value, { depth: 6, customInspect: false, getters: false, breakLength: 80 });
  } catch {
    return UNPRINTABLE;
  }
}

/**
 * Reads with `in` so `toBe(undefined)` still reports its expected value.
 * Drops a pair that prints the same, leaving the host's message to describe
 * the mismatch. Jest hands reporters Maps and Sets as `{}`, for example.
 */
export function assertionComparison(
  source: unknown,
  options: { preformatted?: boolean } = {},
): { expected?: string; actual?: string } {
  if (source === null || typeof source !== "object") return {};
  const preformatted = options.preformatted ?? false;
  const result: { expected?: string; actual?: string } = {};
  for (const key of ["expected", "actual"] as const) {
    try {
      if (key in source) result[key] = format((source as Record<string, unknown>)[key], preformatted);
    } catch {
      // A proxy trap or getter on the error object threw while reading the value.
      result[key] = UNPRINTABLE;
    }
  }
  if (result.expected !== undefined && result.expected === result.actual) return {};
  return result;
}
