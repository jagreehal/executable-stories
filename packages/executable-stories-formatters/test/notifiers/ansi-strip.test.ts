import { describe, it, expect } from "vitest";
import { stripAnsi } from "../../src/notifiers/ansi-strip";

describe("stripAnsi", () => {
  it("strips color codes", () => {
    const input = "\x1B[31mError\x1B[0m: something failed";
    expect(stripAnsi(input)).toBe("Error: something failed");
  });

  it("strips bold and reset sequences", () => {
    const input = "\x1B[1mBold text\x1B[22m and \x1B[0mreset";
    expect(stripAnsi(input)).toBe("Bold text and reset");
  });

  it("strips cursor movement sequences", () => {
    const input = "\x1B[2A\x1B[3Bhello\x1B[1C\x1B[4D";
    expect(stripAnsi(input)).toBe("hello");
  });

  it("returns clean input unchanged", () => {
    const input = "No ANSI codes here!";
    expect(stripAnsi(input)).toBe("No ANSI codes here!");
  });

  it("returns empty string unchanged", () => {
    expect(stripAnsi("")).toBe("");
  });

  it("strips multiple color codes in sequence", () => {
    const input = "\x1B[32m\x1B[1mGreen Bold\x1B[0m\x1B[39m";
    expect(stripAnsi(input)).toBe("Green Bold");
  });

  it("strips 256-color codes", () => {
    const input = "\x1B[38;5;196mRed text\x1B[0m";
    expect(stripAnsi(input)).toBe("Red text");
  });

  it("strips RGB color codes", () => {
    const input = "\x1B[38;2;255;0;0mRed RGB\x1B[0m";
    expect(stripAnsi(input)).toBe("Red RGB");
  });
});
