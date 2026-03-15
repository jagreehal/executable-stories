import { test, expect } from "@playwright/test";
import { story, given, when, then } from "executable-stories-playwright";
import { getAvailableThemes } from "executable-stories-formatters";
import { loadMainReport } from "./helpers.js";
import type { RawRun } from "./helpers.js";

const THEMES = getAvailableThemes();

/** Themes that hide the standard .header (search, theme toggle, detail toggle) */
const THEMES_WITHOUT_HEADER = new Set(["dashboard"]);

function createRun(): RawRun {
  return {
    projectRoot: "/test",
    testCases: [
      {
        title: "Login with valid credentials",
        status: "pass" as const,
        sourceFile: "src/auth.test.ts",
        sourceLine: 1,
        story: {
          scenario: "Login with valid credentials",
          steps: [
            { keyword: "Given" as const, text: "a registered user" },
            { keyword: "When" as const, text: "they submit valid credentials" },
            { keyword: "Then" as const, text: "they are logged in" },
          ],
        },
      },
      {
        title: "Signup with new email",
        status: "pass" as const,
        sourceFile: "src/signup.test.ts",
        sourceLine: 1,
        story: {
          scenario: "Signup with new email",
          steps: [
            { keyword: "Given" as const, text: "a new visitor" },
            { keyword: "When" as const, text: "they submit the signup form" },
            { keyword: "Then" as const, text: "an account is created" },
          ],
        },
      },
      {
        title: "Password reset",
        status: "fail" as const,
        sourceFile: "src/reset.test.ts",
        sourceLine: 1,
        story: {
          scenario: "Password reset",
          steps: [
            { keyword: "Given" as const, text: "a user who forgot their password" },
            { keyword: "When" as const, text: "they request a reset" },
            { keyword: "Then" as const, text: "a reset email is sent" },
          ],
        },
      },
    ],
  };
}

for (const themeName of THEMES) {
  test.describe(`Theme: ${themeName}`, () => {
    test("renders scenarios without JS errors", async ({ page }, testInfo) => {
      story.init(testInfo);
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      given(`a report rendered with the ${themeName} theme`);
      await loadMainReport(page, createRun(), { theme: themeName });

      then("all scenarios are present in the DOM");
      await expect(page.locator(".scenario")).toHaveCount(3);

      then("no JavaScript errors occurred");
      expect(errors).toEqual([]);
    });

    if (!THEMES_WITHOUT_HEADER.has(themeName)) {
      test("search filters scenarios", async ({ page }, testInfo) => {
        story.init(testInfo);

        given(`a report rendered with the ${themeName} theme`);
        await loadMainReport(page, createRun(), { theme: themeName });

        then("all scenarios are visible");
        await expect(page.locator(".scenario")).toHaveCount(3);

        when("the user searches for Login");
        await page.locator(".search-input").fill("Login");

        then("only the Login scenario remains visible");
        const visible = page.locator(".scenario:visible");
        await expect(visible).toHaveCount(1);
        await expect(visible.first()).toContainText(
          "Login with valid credentials",
        );
      });

      test("dark mode toggle works", async ({ page }, testInfo) => {
        story.init(testInfo);

        given(`a report rendered with the ${themeName} theme`);
        await loadMainReport(page, createRun(), { theme: themeName });

        then("the page starts in light mode");
        const html = page.locator("html");
        await expect(html).toHaveAttribute("data-theme", "light");

        when("the theme toggle is clicked");
        await page.locator(".theme-toggle").click();

        then("the page switches to dark mode");
        await expect(html).toHaveAttribute("data-theme", "dark");
      });

      test("detail toggle changes level", async ({ page }, testInfo) => {
        story.init(testInfo);

        given(`a report rendered with the ${themeName} theme`);
        await loadMainReport(page, createRun(), { theme: themeName });

        then("the page starts at full detail level");
        const html = page.locator("html");
        await expect(html).toHaveAttribute("data-detail-level", "full");

        when("the detail toggle is clicked");
        await page.locator(".detail-toggle").click();

        then("the detail level changes");
        const newLevel = await html.getAttribute("data-detail-level");
        expect(newLevel).not.toBe("full");
      });
    }
  });
}
