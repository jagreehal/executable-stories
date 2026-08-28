/**
 * Assertions observed per step.
 *
 * The report grades a scenario's credibility, and the cheapest signal of all is
 * whether the steps that state the claim asserted anything. Vitest keeps a live
 * per-test counter, so the count is observed rather than declared.
 */
import { describe, expect, it } from "vitest";
import { story } from "../story-api";
import type { StoryMeta } from "../types";

function steps(task: { meta: object }): StoryMeta["steps"] {
  return (task.meta as { story: StoryMeta }).story.steps;
}

describe("assertions observed per step", () => {
  it("counts the assertions a wrapped step made", ({ task }) => {
    story.init(task);
    story.given("two numbers 5 and 3");
    story.then("the result is 8", () => {
      expect(5 + 3).toBe(8);
    });

    expect(steps(task)[1].assertions).toBe(1);
  });

  // Marker style puts the assertion after the step, so the count is only final
  // once the test ends — which is exactly when the reporter reads the meta.
  // The captured object is the same one the reporter sees, mutations included.
  let marker: StoryMeta | undefined;

  it("runs a scenario written in marker style", ({ task }) => {
    story.init(task);
    story.given("two numbers 5 and 3");
    story.then("the result is 8");
    expect(5 + 3).toBe(8);
    marker = (task.meta as { story: StoryMeta }).story;
  });

  it("credits a trailing assertion to the marker step it follows", () => {
    expect(marker?.steps[1].assertions).toBe(1);
  });

  it("leaves the setup step it did not belong to at zero", () => {
    expect(marker?.steps[0].assertions).toBe(0);
  });
});
