/**
 * `story.screenshot({ hold })` only waits while the page is recorded, so these run with video on.
 */
import { test, expect } from "@playwright/test";
import { story } from "../story-api";

test.use({ video: "on" });

test("hold 'auto' stays until the step's line has been on screen long enough to read", async ({ page }, testInfo) => {
  story.init({ page }, testInfo);
  await page.setContent("<p>hi</p>");
  // 17 words with the keyword: 6s at 170 words a minute.
  story.when("the reviewer reads every word of this deliberately long step before the next one begins on screen");
  const start = Date.now();
  await story.screenshot({ page, hold: "auto" });
  expect(Date.now() - start).toBeGreaterThanOrEqual(5_500);
});

test("hold 'auto' still holds a short step for a second", async ({ page }, testInfo) => {
  story.init({ page }, testInfo);
  await page.setContent("<p>hi</p>");
  story.when("save");
  const start = Date.now();
  await story.screenshot({ page, hold: "auto" });
  expect(Date.now() - start).toBeGreaterThanOrEqual(1_000);
});
