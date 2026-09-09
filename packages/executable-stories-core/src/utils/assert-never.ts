/**
 * Exhaustiveness guard for closed unions.
 *
 * A `switch` over a discriminated union that ends in `default: return
 * assertNever(value)` stops compiling the moment a new variant is added, which
 * is the only mechanism that keeps a doc kind from being handled in eleven
 * renderers and quietly dropped by the twelfth. Prefer it over a `default` that
 * returns an empty string or `undefined`: that shape compiles forever and loses
 * the entry at runtime.
 *
 * Where a renderer deliberately handles only part of a union, list the excluded
 * variants as explicit no-op cases and keep the guard, so the next variant is a
 * decision someone makes rather than one the `default` makes for them.
 */
export function assertNever(value: never, message = "Unhandled variant"): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}
