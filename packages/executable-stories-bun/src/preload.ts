/**
 * bun:test preload for executable-stories.
 *
 * A top-level `afterAll` in a preload runs once after every test file (once
 * per file under --isolate / --parallel), which is where the run is written.
 *
 * ```toml
 * # bunfig.toml
 * [test]
 * preload = ["executable-stories-bun/preload"]
 * ```
 */

import { afterAll, afterEach, beforeEach, expect } from "bun:test";
import { collector, flush } from "./collector";

afterAll(flush);

/*
 * Count matcher calls from the test's first beforeEach (a preload hook runs before the file's)
 * through its afterEach, as bun does, so the wrapper can check expect.assertions() itself.
 */
beforeEach(() => {
  const state = collector();
  state.assertions = 0;
  state.expected = undefined;
  state.hookRuns.before++;
});

/*
 * This afterEach runs last for every test, and bun skips it once an earlier afterEach throws, so
 * fewer of these than beforeEach runs means a hook failed. Concurrent passes rely on it.
 */
afterEach(() => {
  collector().hookRuns.after++;
});

const COUNTED = Symbol.for("executable-stories-bun.counted");
function countMatchers(proto: Record<PropertyKey, unknown>): void {
  for (const name of Object.getOwnPropertyNames(proto)) {
    const desc = Object.getOwnPropertyDescriptor(proto, name);
    const fn = desc?.value;
    if (name === "constructor" || typeof fn !== "function" || (fn as { [COUNTED]?: true })[COUNTED]) continue;
    const counted = Object.assign(
      function (this: unknown, ...args: unknown[]) {
        collector().assertions++;
        // Custom matchers from expect.extend() have no .apply.
        return Reflect.apply(fn, this, args);
      },
      { [COUNTED]: true as const },
    );
    Object.defineProperty(proto, name, { ...desc, value: counted });
  }
}
const proto = Object.getPrototypeOf(expect(undefined)) as Record<PropertyKey, unknown>;
countMatchers(proto);

const { assertions, hasAssertions, extend } = expect;
expect.assertions = (count: number) => {
  Object.assign(collector(), { expected: { count, exact: true }, declaredAssertions: true });
  return assertions(count);
};
expect.hasAssertions = () => {
  Object.assign(collector(), { expected: { count: 1, exact: false }, declaredAssertions: true });
  return hasAssertions();
};
expect.extend = ((matchers) => {
  extend(matchers);
  countMatchers(proto);
}) as typeof extend;
