import { describe, it, expect } from "vitest";
import { hasSufficientHistory } from "../../src/history/sample-policy";

describe("hasSufficientHistory", () => {
  it("returns true when entries meet minimum", () => {
    expect(hasSufficientHistory([1, 2, 3], 3)).toBe(true);
  });

  it("returns false when entries are below minimum", () => {
    expect(hasSufficientHistory([1, 2], 3)).toBe(false);
  });

  it("returns false for empty array with min 1", () => {
    expect(hasSufficientHistory([], 1)).toBe(false);
  });

  it("returns true when entries exceed minimum", () => {
    expect(hasSufficientHistory([1, 2, 3, 4, 5], 3)).toBe(true);
  });

  it("returns true for min 0 with empty array", () => {
    expect(hasSufficientHistory([], 0)).toBe(true);
  });
});
