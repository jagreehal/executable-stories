/**
 * Take screenshots of each theme report using Playwright.
 * Run: npx tsx src/take-screenshots.ts
 */
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const HTML_DIR = "screenshots/html";
const PNG_DIR = "screenshots/png";
mkdirSync(PNG_DIR, { recursive: true });

const htmlFiles = readdirSync(HTML_DIR).filter((f) => f.endsWith(".html"));

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // Retina quality
  });

  for (const file of htmlFiles) {
    const html = readFileSync(`${HTML_DIR}/${file}`, "utf-8");
    const name = file.replace(".html", "");

    // Light mode screenshot
    const lightPage = await context.newPage();
    await lightPage.route("https://report.test/", (route) =>
      route.fulfill({ contentType: "text/html", body: html }),
    );
    await lightPage.goto("https://report.test/", { waitUntil: "domcontentloaded" });
    await lightPage.waitForTimeout(500);
    await lightPage.screenshot({
      path: `${PNG_DIR}/${name}-light.png`,
      fullPage: true,
    });
    // Also take a viewport-only "above the fold" screenshot
    await lightPage.screenshot({
      path: `${PNG_DIR}/${name}-light-fold.png`,
      fullPage: false,
    });

    // Dark mode screenshot (toggle theme if button exists)
    const themeToggle = lightPage.locator(".theme-toggle");
    if (await themeToggle.count() > 0 && await themeToggle.isVisible()) {
      await themeToggle.click();
      await lightPage.waitForTimeout(300);
      await lightPage.screenshot({
        path: `${PNG_DIR}/${name}-dark.png`,
        fullPage: true,
      });
      await lightPage.screenshot({
        path: `${PNG_DIR}/${name}-dark-fold.png`,
        fullPage: false,
      });
    }

    await lightPage.close();
    console.log(`  ✓ ${name}`);
  }

  await browser.close();
  console.log(`\nDone! Screenshots saved to ${PNG_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
