import { describe, expect, it } from "vitest";
import { assertionComparison } from "./assertion-comparison";

describe("assertionComparison", () => {
  it("keeps strings a host already formatted", () => {
    expect(assertionComparison({ expected: '"a"', actual: '"b"' }, { preformatted: true })).toEqual({
      expected: '"a"',
      actual: '"b"',
    });
  });

  it("formats raw values from a preformatting host that left them raw", () => {
    expect(assertionComparison({ expected: 3, actual: 2 }, { preformatted: true })).toEqual({
      expected: "3",
      actual: "2",
    });
  });

  it("keeps distinct raw values distinct", () => {
    const pair = (expected: unknown, actual: unknown) => assertionComparison({ expected, actual });
    const maps = pair(new Map([["a", 1]]), new Map([["b", 2]]));
    expect(maps.expected).not.toBe(maps.actual);
    const sets = pair(new Set([1]), new Set([2]));
    expect(sets.expected).not.toBe(sets.actual);
    expect(pair("3", 3)).toEqual({ expected: "'3'", actual: "3" });
    expect(pair(NaN, null)).toEqual({ expected: "NaN", actual: "null" });
  });

  it("drops a pair that prints the same, so it cannot hide the mismatch", () => {
    // What Jest hands a reporter for `expect(new Map([['a', 1]])).toEqual(new Map([['b', 2]]))`.
    expect(assertionComparison({ expected: {}, actual: {} })).toEqual({});
    expect(assertionComparison({ expected: "x", actual: "x" }, { preformatted: true })).toEqual({});
  });

  it("keeps an expected undefined that was set", () => {
    expect(assertionComparison({ expected: undefined, actual: 1 })).toEqual({ expected: "undefined", actual: "1" });
  });

  it("never throws on values that cannot be converted to a primitive", () => {
    const cyclic = Object.create(null) as Record<string, unknown>;
    cyclic.self = cyclic;
    const hostile = new Proxy({}, {
      get() { throw new Error("get"); },
      ownKeys() { throw new Error("ownKeys"); },
      getPrototypeOf() { throw new Error("proto"); },
    });
    const result = assertionComparison({ expected: cyclic, actual: hostile });
    expect(result.expected).toContain("[Circular");
    expect(typeof result.actual).toBe("string");
  });

  it("survives an error object whose fields throw on read", () => {
    const source = { get expected() { throw new Error("boom"); }, actual: 1 };
    expect(assertionComparison(source)).toEqual({ expected: "[unprintable value]", actual: "1" });
  });

  it("returns nothing for errors without values", () => {
    expect(assertionComparison(new Error("boom"))).toEqual({});
    expect(assertionComparison(undefined)).toEqual({});
  });
});
