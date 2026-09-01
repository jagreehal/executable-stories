import { story, given, when, then, and } from "executable-stories-playwright";
import {
  test,
  expect,
  callTool,
  callToolRaw,
  loadStoryReport,
  toolNames,
} from "./webmcp-fixture.js";
import type { TestRunResult } from "./helpers.js";

/**
 * The browser lane for the report's WebMCP tools.
 *
 * The unit tier (executable-stories-react) proves the tool definitions. This
 * proves the shipped artifact: that the inlined island bundle in a real
 * `--format html` file registers them in a real browser, and that calling one
 * changes what a reader sees. A tool that works in jsdom and not in the bundle
 * is a green suite and a broken product.
 */

function testCase(
  id: string,
  scenario: string,
  status: "passed" | "failed",
  tags: string[] = [],
  errorMessage?: string,
) {
  return {
    id,
    story: {
      scenario,
      steps: [
        { keyword: "Given", text: `${scenario} is set up` },
        { keyword: "Then", text: `${scenario} holds` },
      ],
      docs: [],
      tags,
      tickets: [],
      suitePath: [],
      sourceOrder: 0,
    },
    sourceFile: `src/${id}.story.test.ts`,
    sourceLine: 1,
    status,
    durationMs: 100,
    attachments: [],
    stepResults: [],
    titlePath: [scenario],
    retry: 0,
    retries: 0,
    tags,
    ...(errorMessage ? { errorMessage } : {}),
  };
}

function createRun(): TestRunResult {
  return {
    testCases: [
      testCase("checkout-1", "Guest checkout completes", "passed", ["checkout"]),
      testCase("checkout-2", "Card payment is declined", "failed", ["checkout"], "Expected 200, got 402"),
      testCase("search-1", "Search returns results", "passed", ["search"]),
    ],
    startedAtMs: 1_700_000_000_000,
    finishedAtMs: 1_700_000_001_000,
    durationMs: 1000,
    projectRoot: "/test",
    runId: "run-webmcp",
  } as TestRunResult;
}

test("An agent reads the report's failures without a filesystem", async ({ page }, testInfo) => {
  story.init(testInfo);

  await given("a published HTML report with a failing scenario", async () => {
    await loadStoryReport(page, createRun());
  });

  await and("the page has registered its tools with the browser", async () => {
    expect(await toolNames(page)).toEqual([
      "filter_scenarios",
      "get_failing_scenarios",
      "get_feature_summary",
      "get_scenario",
      "list_scenarios",
    ]);
  });

  await when("the agent asks what failed", async () => {
    const payload = await callTool(page, "get_failing_scenarios");
    story.json({ label: "Tool result", value: payload });

    await then("it gets the failing scenario and its error", async () => {
      expect(payload["total"]).toBe(1);
      const scenarios = payload["scenarios"] as Array<Record<string, unknown>>;
      expect(scenarios[0]).toMatchObject({
        title: "Card payment is declined",
        status: "failed",
      });
      expect(JSON.stringify(scenarios[0]?.["error"])).toContain("got 402");
    });

    await and("the answer says which run it came from", async () => {
      expect(payload["run"]).toMatchObject({ runId: "run-webmcp" });
      expect(payload["run"]).toHaveProperty("ageDays");
    });
  });
});

test("An agent filters the report and the reader sees it happen", async ({ page }, testInfo) => {
  story.init(testInfo);

  await given("a published HTML report showing every scenario", async () => {
    await loadStoryReport(page, createRun());
    await expect(page.getByRole("heading", { name: "Search returns results", level: 2 })).toBeVisible();
  });

  await when("the agent filters to the checkout failures", async () => {
    const payload = await callTool(page, "filter_scenarios", {
      status: "failed",
      tags: ["checkout"],
    });
    expect(payload["applied"]).toMatchObject({ matched: 1, status: "failed" });
  });

  await then("the scenario list on screen narrows to that one", async () => {
    await expect(page.getByRole("heading", { name: "Card payment is declined", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Search returns results", level: 2 })).toBeHidden();
  });

  await and("the reader is told an agent did it, and offered the way back", async () => {
    await expect(page.getByText(/An agent filtered this report/)).toBeVisible();
    await page.getByRole("button", { name: "Show all" }).click();
    await expect(page.getByRole("heading", { name: "Search returns results", level: 2 })).toBeVisible();
  });
});

test("A bad argument comes back as advice, not a dead call", async ({ page }, testInfo) => {
  story.init(testInfo);

  await given("a published HTML report", async () => {
    await loadStoryReport(page, createRun());
  });

  await when("the agent passes a status the report does not have", async () => {
    const answer = await callToolRaw(page, "filter_scenarios", { status: "flaky" });
    story.kv({ label: "Tool answer", value: answer });

    await then("it is told what the valid values are", async () => {
      expect(answer).toContain("must be one of");
      expect(answer).toContain("passed");
    });
  });

  await and("the reader's view was left alone", async () => {
    await expect(page.getByText(/An agent filtered this report/)).toBeHidden();
    await expect(page.getByRole("heading", { name: "Search returns results", level: 2 })).toBeVisible();
  });
});

test("The run JSON is in the page even with no tool support", async ({ page }, testInfo) => {
  story.init(testInfo);

  await given("a published HTML report", async () => {
    await loadStoryReport(page, createRun());
  });

  await then("the whole run is readable as embedded JSON", async () => {
    const runId = await page.evaluate(() => {
      const script = document.querySelector("#es-report-data");
      return (JSON.parse(script!.textContent!) as { runId: string }).runId;
    });
    expect(runId).toBe("run-webmcp");
  });
});
