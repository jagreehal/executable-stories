import { describe, expect, it } from "vitest";

import { assertNever } from "./assert-never.js";

describe("assertNever", () => {
  it("throws naming the value it was handed", () => {
    expect(() => assertNever("video" as never)).toThrow(/video/);
  });

  it("carries the caller's message so the throw says which switch missed it", () => {
    expect(() => assertNever("video" as never, "Unhandled doc kind")).toThrow(
      /Unhandled doc kind/
    );
  });

  it("is a compile error when a switch is missing a case", () => {
    // The runtime half of this test is trivial; the type-check is the point.
    // If `assertNever` ever stops narrowing to `never`, the @ts-expect-error
    // below becomes unused and `tsc` fails the build.
    const handled = (kind: "a" | "b"): number => {
      switch (kind) {
        case "a":
          return 1;
        default:
          // @ts-expect-error "b" is unhandled, so `kind` is not `never` here
          return assertNever(kind);
      }
    };
    expect(handled("a")).toBe(1);
  });
});
