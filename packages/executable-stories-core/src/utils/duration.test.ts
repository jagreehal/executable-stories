import { describe, expect, it } from "vitest";
import { formatDuration } from "./duration";

describe("formatDuration", () => {
  it.each([
    [0, "0 ms"],
    [0.0004, "1 µs"],
    [0.026, "26 µs"],
    [0.9994, "999 µs"],
    [0.9996, "1 ms"],
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
