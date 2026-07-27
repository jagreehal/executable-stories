import { describe, it, expect } from "vitest";

import { diffStateValues, formatStateValue, summarizeStateChanges } from "./state-diff.js";

describe("diffStateValues", () => {
  it("returns [] for deep-equal values", () => {
    expect(diffStateValues({ a: 1, b: [1, 2] }, { a: 1, b: [1, 2] })).toEqual([]);
    expect(diffStateValues(null, null)).toEqual([]);
    expect(diffStateValues(7, 7)).toEqual([]);
  });

  it("reports changed scalars with their path", () => {
    expect(diffStateValues({ total: 9 }, { total: 27 })).toEqual([
      { path: "total", kind: "changed", before: 9, after: 27 },
    ]);
  });

  it("reports added and removed keys, added in after-order then removed", () => {
    expect(diffStateValues({ a: 1, gone: true }, { a: 1, coupon: "X" })).toEqual([
      { path: "coupon", kind: "added", after: "X" },
      { path: "gone", kind: "removed", before: true },
    ]);
  });

  it("recurses into nested objects and arrays with bracket paths", () => {
    const before = { items: [{ sku: "hoodie", qty: 1 }] };
    const after = { items: [{ sku: "hoodie", qty: 2 }, { sku: "cap", qty: 1 }] };
    expect(diffStateValues(before, after)).toEqual([
      { path: "items[0].qty", kind: "changed", before: 1, after: 2 },
      { path: "items[1]", kind: "added", after: { sku: "cap", qty: 1 } },
    ]);
  });

  it("reports shrunk arrays as removed indices", () => {
    expect(diffStateValues({ xs: [1, 2, 3] }, { xs: [1] })).toEqual([
      { path: "xs[1]", kind: "removed", before: 2 },
      { path: "xs[2]", kind: "removed", before: 3 },
    ]);
  });

  it("treats a type change as one changed entry at that path", () => {
    expect(diffStateValues({ v: { a: 1 } }, { v: [1] })).toEqual([
      { path: "v", kind: "changed", before: { a: 1 }, after: [1] },
    ]);
    expect(diffStateValues(3, { a: 1 })).toEqual([{ path: "", kind: "changed", before: 3, after: { a: 1 } }]);
  });

  it("handles null transitions", () => {
    expect(diffStateValues({ a: null }, { a: 1 })).toEqual([{ path: "a", kind: "changed", before: null, after: 1 }]);
  });
});

describe("summarizeStateChanges", () => {
  it("formats changed, added, and removed lines", () => {
    const lines = summarizeStateChanges([
      { path: "items[0].qty", kind: "changed", before: 1, after: 2 },
      { path: "coupon", kind: "added", after: "SAVE10" },
      { path: "giftWrap", kind: "removed", before: true },
    ]);
    expect(lines).toEqual(['items[0].qty: 1 → 2', '+ coupon: "SAVE10"', "− giftWrap"]);
  });

  it("labels a root-level change", () => {
    expect(summarizeStateChanges([{ path: "", kind: "changed", before: 1, after: 2 }])).toEqual(["(root): 1 → 2"]);
  });
});

describe("formatStateValue", () => {
  it("truncates long values with an ellipsis", () => {
    const long = formatStateValue({ text: "x".repeat(200) }, 20);
    expect(long).toHaveLength(20);
    expect(long.endsWith("…")).toBe(true);
  });
});
