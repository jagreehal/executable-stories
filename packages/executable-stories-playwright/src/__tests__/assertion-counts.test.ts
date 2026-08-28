/**
 * Assertions observed per step.
 *
 * Playwright keeps a live per-test assertion counter, so the count is observed
 * rather than declared. A wrapped step measures its own body; a marker takes
 * the assertions written after it, which are only final once the test ends.
 */
import { test, expect } from "@playwright/test";
import { story } from "../story-api";
import type { StoryMeta } from "../types";

function getStoryMeta(testInfo: {
  annotations: Array<{ type: string; description?: string }>;
}): StoryMeta | undefined {
  const annotation = testInfo.annotations.find((a) => a.type === "story-meta");
  if (!annotation?.description) return undefined;
  return JSON.parse(annotation.description);
}

test.describe("assertions observed per step", () => {
  // Serial keeps these in one worker so the marker case can be checked after
  // the test that produced it has finished.
  test.describe.configure({ mode: "serial" });

  test("counts the assertions a wrapped step made", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("two numbers 5 and 3");
    await story.then("the result is 8", async () => {
      expect(5 + 3).toBe(8);
    });

    expect(getStoryMeta(testInfo)?.steps[1].assertions).toBe(1);
  });

  // The marker's own count is only final after the test body, so it is checked
  // from the annotation the reporter reads, once the flush has run.
  let marker: { annotations: Array<{ type: string; description?: string }> } | undefined;

  test("runs a scenario written in marker style", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("two numbers 10 and 4");
    story.then("the result is 6");
    expect(10 - 4).toBe(6);
    marker = testInfo;
  });

  test("credits a trailing assertion to the marker step it follows", async () => {
    expect(getStoryMeta(marker!)?.steps[1].assertions).toBe(1);
  });

  test("leaves the setup step it did not belong to at zero", async () => {
    expect(getStoryMeta(marker!)?.steps[0].assertions).toBe(0);
  });
});
