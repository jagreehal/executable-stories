import { test, expect } from "@playwright/test";
import { story, given, when, then, and } from "executable-stories-playwright";
import { loadDiffReport } from "./helpers.js";
import type { TestRunResult } from "./helpers.js";

function createTestCase(
  id: string,
  scenario: string,
  status: "passed" | "failed",
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    story: {
      scenario,
      steps: [],
      docs: [],
      tags: [],
      tickets: [],
      suitePath: [],
      sourceOrder: 0,
    },
    sourceFile: `src/${id}.test.ts`,
    sourceLine: 1,
    status,
    durationMs: 100,
    attachments: [],
    stepResults: [],
    titlePath: [scenario],
    retry: 0,
    retries: 0,
    tags: [],
    ...overrides,
  };
}

function createRun(testCases: ReturnType<typeof createTestCase>[], startMs: number): TestRunResult {
  return {
    testCases,
    startedAtMs: startMs,
    finishedAtMs: startMs + 1000,
    durationMs: 1000,
    projectRoot: "/test",
    runId: `run-${startMs}`,
  } as TestRunResult;
}

function createDiffFixture(): {
  baseline: TestRunResult;
  current: TestRunResult;
} {
  const baseline = createRun([
      createTestCase("regressed-1", "Login with valid credentials", "passed"),
      createTestCase("fixed-1", "Password reset flow", "failed", {
        errorMessage: "Timeout",
      }),
      createTestCase("changed-1", "Add item to cart", "passed", {
        story: {
          scenario: "Add item to cart",
          steps: [],
          docs: [{ kind: "note", text: "Old cart logic", phase: "static" }],
          tags: ["smoke"],
          tickets: [],
          suitePath: [],
          sourceOrder: 0,
        },
        tags: ["smoke"],
      }),
      createTestCase("removed-1", "Legacy checkout", "passed"),
      createTestCase("unchanged-1", "Homepage loads", "passed"),
    ], 1000);

  const current = createRun([
      createTestCase("regressed-1", "Login with valid credentials", "failed", {
        errorMessage: "Auth service down",
      }),
      createTestCase("fixed-1", "Password reset flow", "passed"),
      createTestCase("changed-1", "Add item to cart", "passed", {
        story: {
          scenario: "Add item to cart",
          steps: [],
          docs: [{ kind: "note", text: "New cart logic", phase: "static" }],
          tags: ["smoke", "release"],
          tickets: [],
          suitePath: [],
          sourceOrder: 0,
        },
        tags: ["smoke", "release"],
      }),
      // removed-1 gone
      createTestCase("added-1", "Add to wishlist", "passed"),
      createTestCase("unchanged-1", "Homepage loads", "passed"),
    ], 3000);

  return { baseline, current };
}

test.describe("Diff HTML report interactivity", () => {
  test("kind filter buttons show only matching scenarios", async ({
    page,
  }, testInfo) => {
    story.init(testInfo);

    given(
      "a diff report with regressed, fixed, changed, added, and removed scenarios",
    );
    const { baseline, current } = createDiffFixture();
    await loadDiffReport(page, baseline, current);

    then("the regressed filter is active by default");
    const regressedBtn = page.locator('[data-filter="regressed"]');
    await expect(regressedBtn).toHaveClass(/active/);

    and("only the regressed scenario is visible");
    const visibleCards = page.locator(".scenario-card:visible");
    await expect(visibleCards).toHaveCount(1);
    await expect(visibleCards.first()).toContainText(
      "Login with valid credentials",
    );

    when("the All filter button is clicked");
    const allBtn = page.locator('[data-filter="all"]');
    await allBtn.click();

    then("all non-unchanged scenario cards are visible");
    await expect(page.locator(".scenario-card:visible")).toHaveCount(5);

    when("the Fixed filter button is clicked");
    await page.locator('[data-filter="fixed"]').click();

    then("only the fixed scenario is visible");
    const fixedVisible = page.locator(".scenario-card:visible");
    await expect(fixedVisible).toHaveCount(1);
    await expect(fixedVisible.first()).toContainText("Password reset flow");
  });

  test("search input filters scenario cards by text", async ({
    page,
  }, testInfo) => {
    story.init(testInfo);

    given("a diff report showing all scenarios");
    const { baseline, current } = createDiffFixture();
    await loadDiffReport(page, baseline, current);
    await page.locator('[data-filter="all"]').click();

    when("the user types cart in the search input");
    await page.locator('input[type="search"]').fill("cart");

    then("only the cart scenario is visible");
    const visible = page.locator(".scenario-card:visible");
    await expect(visible).toHaveCount(1);
    await expect(visible.first()).toContainText("Add item to cart");

    when("the search is cleared");
    await page.locator('input[type="search"]').fill("");

    then("all scenario cards return");
    await expect(page.locator(".scenario-card:visible")).toHaveCount(5);
  });

  test("search and kind filters work together", async ({ page }, testInfo) => {
    story.init(testInfo);

    given("a diff report showing all scenarios");
    const { baseline, current } = createDiffFixture();
    await loadDiffReport(page, baseline, current);
    await page.locator('[data-filter="all"]').click();

    when("the user searches for login");
    // data-search includes scenario name + sourceFile + changedFields
    await page.locator('input[type="search"]').fill("login");

    then("only the login scenario is visible");
    await expect(page.locator(".scenario-card:visible")).toHaveCount(1);

    when("the Fixed filter is applied instead");
    await page.locator('[data-filter="fixed"]').click();

    then("no scenarios match both filters");
    await expect(page.locator(".scenario-card:visible")).toHaveCount(0);

    when("the All filter is restored");
    await page.locator('[data-filter="all"]').click();

    then("the login scenario is visible again");
    await expect(page.locator(".scenario-card:visible")).toHaveCount(1);
  });

  test("auto-selects fixed filter when no regressions but fixes exist", async ({
    page,
  }, testInfo) => {
    story.init(testInfo);

    given("a diff with only a fixed scenario and no regressions");
    const baseline = createRun([
      createTestCase("f1", "Now fixed", "failed", {
        errorMessage: "was broken",
      }),
    ], 1000);
    const current = createRun([
      createTestCase("f1", "Now fixed", "passed"),
    ], 3000);

    when("the diff report is loaded");
    await loadDiffReport(page, baseline, current);

    then("the fixed filter is active by default");
    await expect(page.locator('[data-filter="fixed"]')).toHaveClass(/active/);
  });

  test("scenario cards render DSL content (steps, docs) visibly", async ({
    page,
  }, testInfo) => {
    story.init(testInfo);

    given("a diff where a scenario changed its steps and docs");
    const baseline = createRun([
      createTestCase("dsl-1", "DSL content renders", "passed", {
        story: {
          scenario: "DSL content renders",
          steps: [{ keyword: "Given", text: "a baseline step" }],
          docs: [
            { kind: "note", text: "baseline note text", phase: "static" },
          ],
          tags: [],
          tickets: [],
          suitePath: [],
          sourceOrder: 0,
        },
      }),
    ], 1000);
    const current = createRun([
      createTestCase("dsl-1", "DSL content renders", "passed", {
        story: {
          scenario: "DSL content renders",
          steps: [{ keyword: "Given", text: "an updated step" }],
          docs: [
            { kind: "note", text: "current note text", phase: "static" },
          ],
          tags: [],
          tickets: [],
          suitePath: [],
          sourceOrder: 0,
        },
      }),
    ], 3000);

    when("the diff report is loaded and all cards are shown");
    await loadDiffReport(page, baseline, current);
    await page.locator('[data-filter="all"]').click();

    then("the scenario card is visible");
    const card = page
      .locator(".scenario-card")
      .filter({ hasText: "DSL content renders" });
    await expect(card).toBeVisible();

    and(
      "the baseline and current DSL content are both visible in the card",
    );
    await expect(card).toContainText("baseline note text");
    await expect(card).toContainText("current note text");
    await expect(card).toContainText("a baseline step");
    await expect(card).toContainText("an updated step");
  });
});
