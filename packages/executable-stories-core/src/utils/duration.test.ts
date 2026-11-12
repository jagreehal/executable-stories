import { describe, expect, it } from "vitest";
import { formatDuration } from "./duration";

describe("formatDuration", () => {
  it.each([
    [999, "999 ms"],
    [1500, "1.50 s"],
    [150_000, "2m 30s"],
    [3_600_000, "1h 0m"],
    [86_399_000, "23h 59m"],
    [86_400_000, "1d 0h"],
    [4_622_400_000, "53d 12h"],
  ])("%d ms → %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});
