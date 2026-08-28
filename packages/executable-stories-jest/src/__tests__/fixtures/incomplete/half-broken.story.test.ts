/**
 * Fixture: one healthy story beside a suite whose beforeAll throws.
 *
 * The broken suite's tests fail without ever reaching `story.init()`, so the
 * file's scenarios are incomplete even though it produced a story.
 */
import { describe, it, expect, beforeAll } from "@jest/globals";
import { story } from "executable-stories-jest";

describe("Healthy", () => {
  it("declares its story", () => {
    story.init();
    story.given("a working suite");
    story.then("the story is recorded");
    expect(true).toBe(true);
  });
});

describe("Broken", () => {
  beforeAll(() => {
    throw new Error("setup exploded");
  });

  it("never declares its story", () => {
    story.init();
    story.given("a suite that cannot set up");
  });
});
