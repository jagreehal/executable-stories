import { test, expect } from "@playwright/test";
import { story, given, when, then } from "executable-stories-playwright";
import { loadMainReport } from "./helpers.js";
import type { RawRun } from "./helpers.js";

function createRun(
  testCases: Array<{
    scenario: string;
    status: string;
    steps?: Array<{ keyword: "Given" | "When" | "Then" | "And" | "But"; text: string }>;
  }>,
): RawRun {
  return {
    projectRoot: "/test",
    testCases: testCases.map((tc, i) => ({
      title: tc.scenario,
      status: tc.status as "pass" | "fail" | "skip",
      sourceFile: `src/test-${i}.ts`,
      sourceLine: 1,
      story: {
        scenario: tc.scenario,
        steps: tc.steps ?? [],
      },
    })),
  };
}

test.describe("Main HTML report interactivity", () => {
  test("search input filters scenarios by text", async ({ page }, testInfo) => {
    story.init(testInfo);

    given("a report with two scenarios");
    const run = createRun([
      { scenario: "Login with valid credentials", status: "pass" },
      { scenario: "Signup with new email", status: "pass" },
    ]);

    when("the report is loaded in a browser");
    await loadMainReport(page, run);

    then("both scenarios are visible");
    const scenarios = page.locator(".scenario");
    await expect(scenarios).toHaveCount(2);

    when("the user types Login in the search input");
    const searchInput = page.locator(".search-input");
    await searchInput.fill("Login");

    then("only the Login scenario remains visible");
    // Wait for debounce (150ms) + rendering
    const visible = page.locator(".scenario:visible");
    await expect(visible).toHaveCount(1);
    await expect(visible.first()).toContainText("Login with valid credentials");
  });

  test("dark mode toggle switches theme attribute", async ({
    page,
  }, testInfo) => {
    story.init(testInfo);

    given("a report loaded in a browser");
    const run = createRun([{ scenario: "Test scenario", status: "pass" }]);
    await loadMainReport(page, run);

    then("the page starts in light mode");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "light");

    when("the theme toggle is clicked");
    await page.locator(".theme-toggle").click();

    then("the page switches to dark mode");
    await expect(html).toHaveAttribute("data-theme", "dark");

    when("the theme toggle is clicked again");
    await page.locator(".theme-toggle").click();

    then("the page switches back to light mode");
    await expect(html).toHaveAttribute("data-theme", "light");
  });

  test("detail toggle cycles through detail levels", async ({
    page,
  }, testInfo) => {
    story.init(testInfo);

    given("a report with documentation content");
    const run = createRun([
      {
        scenario: "Story with docs",
        status: "pass",
        steps: [{ keyword: "Given", text: "some context" }],
      },
    ]);
    await loadMainReport(page, run);

    then("the page starts at full detail level");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-detail-level", "full");

    when("the detail toggle is clicked");
    await page.locator(".detail-toggle").click();

    then("the detail level changes from full");
    const newLevel = await html.getAttribute("data-detail-level");
    expect(newLevel).not.toBe("full");
  });
});
