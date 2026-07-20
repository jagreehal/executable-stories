/**
 * Level 4 — executable-story journeys across the generated docs site. Proves
 * the rendered surfaces a reader actually uses: the stories index (the
 * interactive React `<Report/>` island — the SAME component the standalone
 * single-file HTML report uses) and the explorer filter. Each journey is an
 * executable story (it generates docs/e2e-stories.*) and ends with an
 * accessibility check on the path that matters. A couple carry visual snapshots
 * for regression.
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { story } from "executable-stories-playwright";

async function expectNoSeriousA11y(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
}

test("The stories index renders the interactive report grouped by feature", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["docs-site", "index"] });

  story.given("the docs site is built and served");
  await page.goto("/stories/");

  story.when("the reader opens the Stories index");
  // Starlight owns the page title; the embedded report drops its own (hideHeader).
  await expect(page.getByRole("heading", { name: "Stories", level: 1 })).toBeVisible();

  story.then("the interactive report and a feature group are shown");
  // The React island hydrates a live search box and groups scenarios by feature.
  await expect(page.getByRole("searchbox", { name: /search/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "checkout", level: 2 })).toBeVisible();

  story.and("the index is accessible");
  await expectNoSeriousA11y(page);

  await expect(page).toHaveScreenshot("stories-index.png", { fullPage: true });
});

test("The index shows a failed scenario's steps and error inline", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["docs-site", "report"] });

  story.given("the reader is on the Stories index");
  await page.goto("/stories/");

  story.when("the interactive report hydrates");
  await expect(page.getByRole("searchbox", { name: /search/i })).toBeVisible();

  story.then("each scenario's steps are shown inline, still on the index");
  // Scenarios are expanded by default in the report — no navigation.
  await expect(page).toHaveURL(/\/stories\/?$/);
  await expect(page.getByText("a customer whose card will be declined")).toBeVisible();
  await expect(page.getByText("no order is created")).toBeVisible();

  story.and("the failure message is shown in place");
  // The report renders failures as an alert region (not a string-renderer .error-box).
  await expect(page.getByRole("alert").first()).toContainText(/declined/i);

  story.and("the report is accessible");
  await expectNoSeriousA11y(page);

  await expect(page).toHaveScreenshot("stories-index-expanded.png", { fullPage: true });
});

test("The explorer filters scenarios by search text", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["docs-site", "explorer"] });

  story.given("the reader is on the Explorer");
  await page.goto("/explorer/");
  await expect(page.getByRole("heading", { name: "Scenario Explorer", level: 1 })).toBeVisible();
  // Scope title assertions to the explorer's own result list: the Starlight
  // sidebar also links every scenario by title, so a page-wide getByText would
  // match the always-present nav link, not the filterable card.
  const results = page.getByTestId("list");

  story.when("they type a query that matches one feature");
  await page.getByPlaceholder(/search scenarios/i).fill("gift wrapping");

  story.then("only the matching scenario remains");
  await expect(results.getByText(/Gift wrapping is offered/i)).toBeVisible();
  // Non-matches are hidden (filtered client-side), not necessarily removed.
  await expect(results.getByText(/Checkout is blocked/i)).toBeHidden();
});

test("An authored page embeds a live scenario as evidence", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["docs-site", "embed"] });

  story.given("a hand-written guide that embeds a scenario by id");
  await page.goto("/guides/embedding-scenarios/");

  story.then("the inline status pill links the scenario's story page");
  const pill = page.getByTestId("status-ref");
  await expect(pill).toBeVisible();
  await expect(pill).toHaveAttribute("data-status", "passed");
  await expect(pill).toHaveAttribute("href", /\/stories\/a-returning-customer/);

  story.and("the full scenario card renders with its steps, from the latest run");
  const card = page.getByTestId("embed-scenario");
  await expect(card).toBeVisible();
  await expect(card).toContainText("a signed-in customer with a saved card");

  story.and("the page is accessible");
  await expectNoSeriousA11y(page);
});

test("Agents can read the published site without an HTML parser", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["docs-site", "agent"] });

  story.given("the built site is served");
  story.when("an agent fetches /llms.txt");
  const llms = await page.request.get("/llms.txt");
  expect(llms.status()).toBe(200);
  const index = await llms.text();

  story.then("it gets an llms.txt index linking every scenario's Markdown twin");
  expect(index).toContain("# Stories");
  expect(index).toMatch(/- \[A returning customer checks out with a saved card\]\(\/stories\/.*\.md\): passed/);

  story.and("each Markdown twin renders the scenario's steps and status");
  const twin = await page.request.get("/stories/a-returning-customer-checks-out-with-a-saved-card.md");
  expect(twin.status()).toBe(200);
  const md = await twin.text();
  expect(md).toContain("# A returning customer checks out with a saved card");
  expect(md).toContain("- Status: passed");
  expect(md).toMatch(/\*\*Given\*\* a signed-in customer with a saved card/);
});

test("The explorer filters scenarios by status", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["docs-site", "explorer", "filter"] });

  story.given("the reader is on the Explorer with every scenario listed");
  await page.goto("/explorer/");
  // Scope to the explorer's result list — the Starlight sidebar links every
  // scenario by title regardless of the active filter, so a page-wide match
  // would find the nav link instead of the filterable card.
  const results = page.getByTestId("list");
  await expect(results.getByText(/Checkout is blocked/i)).toBeVisible();
  await expect(results.getByText(/A returning customer/i)).toBeVisible();

  story.when("they choose the Failed status filter");
  // ExplorerView's vanilla-JS status <select> — static, no island.
  await page.getByTestId("status-filter").selectOption("failed");

  story.then("only failed scenarios remain");
  await expect(results.getByText(/Checkout is blocked/i)).toBeVisible();
  await expect(results.getByText(/A returning customer/i)).toBeHidden();

  story.and("resetting to all statuses restores the list");
  await page.getByTestId("status-filter").selectOption("");
  await expect(results.getByText(/A returning customer/i)).toBeVisible();
});
