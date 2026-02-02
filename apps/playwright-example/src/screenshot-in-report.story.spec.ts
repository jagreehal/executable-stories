/**
 * Example: capture a screenshot and show it in the generated story report.
 * Also demonstrates linking the Playwright-recorded video in the report.
 *
 * Run: pnpm test
 * Then open src/screenshot-in-report.story.docs.md — the image and video path appear.
 */
import { story, given, when, then, doc } from "playwright-executable-stories";
import type { TestInfo } from "@playwright/test";

// Path relative to project root; report is colocated in src/, so use ../screenshots/ in the doc
const SCREENSHOT_PATH = "screenshots/dashboard.png";
const DOC_IMAGE_PATH = "../screenshots/dashboard.png";

story("Screenshot appears in generated report", () => {
  given("user is on a page", async ({ page }) => {
    await page.setContent(
      "<!DOCTYPE html><html><body><h1>Hello</h1><p>This page is screenshot and linked in the story report.</p></body></html>"
    );
  });

  when("user sees the content", async ({ page }) => {
    await page.screenshot({ path: SCREENSHOT_PATH });
    doc.runtime.screenshot(DOC_IMAGE_PATH, "Dashboard / example page");
  });

  then("the screenshot is in the story report", async () => {
    // No assertion needed — the report is generated with the image link.
    // Open src/screenshot-in-report.story.docs.md after running tests.
  });
});

story("Video is recorded and linked in report", () => {
  given("user is on a page", async ({ page }) => {
    await page.setContent(
      "<!DOCTYPE html><html><body><h1>Video example</h1></body></html>"
    );
  });

  when("the step runs", async () => {
    // Minimal step so this test has a short video
  });

  then("video path is in the story report", async (_args, testInfo?: TestInfo) => {
    const video = testInfo?.video();
    if (video) {
      try {
        const path = await video.path();
        doc.runtime.kv("Video (this step)", path);
      } catch {
        doc.runtime.kv("Video output", "test-results/");
      }
    }
    doc.runtime.note("Videos are under test-results/; run `pnpm test:ui` or open playwright-report/ to watch.");
  });
});
