import { test, expect } from "@playwright/test";
import { loadStoryReport, callTool, toolNames } from "./webmcp-fixture.js";
import type { TestRunResult } from "./helpers.js";

/**
 * The native lane: the same report, driven by a real Chrome with the WebMCP
 * flags on and NO test double installed.
 *
 * Its whole job is to stop the shim in `webmcp-fixture.ts` drifting into
 * fiction. The default lane asserts what the report's tools do; this asserts
 * that the browser we are pretending to be still behaves that way. When the two
 * disagree, the shim is wrong until proven otherwise.
 *
 * Excluded from the default suite by extension: the config matches
 * `*.story.spec.ts`. Run it on demand:
 *
 *   pnpm test:webmcp:native
 */

function createRun(): TestRunResult {
  return {
    testCases: [
      {
        id: "native-1",
        story: {
          scenario: "Card payment is declined",
          steps: [{ keyword: "Then", text: "the payment is refused" }],
          docs: [],
          tags: ["checkout"],
          tickets: [],
          suitePath: [],
          sourceOrder: 0,
        },
        sourceFile: "src/native-1.story.test.ts",
        sourceLine: 1,
        status: "failed",
        errorMessage: "Expected 200, got 402",
        durationMs: 100,
        attachments: [],
        stepResults: [],
        titlePath: ["Card payment is declined"],
        retry: 0,
        retries: 0,
        tags: ["checkout"],
      },
    ],
    startedAtMs: 1_700_000_000_000,
    finishedAtMs: 1_700_000_001_000,
    durationMs: 1000,
    projectRoot: "/test",
    runId: "run-native",
  } as TestRunResult;
}

test("the report registers its tools with a real browser", async ({ page }) => {
  await loadStoryReport(page, createRun());
  expect(await toolNames(page)).toEqual([
    "filter_scenarios",
    "get_failing_scenarios",
    "get_feature_summary",
    "get_scenario",
    "list_scenarios",
  ]);
});

test("getTools sorts by name and serialises inputSchema to a string", async ({ page }) => {
  await loadStoryReport(page, createRun());
  const descriptors = await page.evaluate(async () => {
    const tools = await document.modelContext!.getTools();
    return tools.map((t) => ({ name: t.name, schemaType: typeof t.inputSchema }));
  });
  expect(descriptors.map((d) => d.name)).toEqual([...descriptors.map((d) => d.name)].sort());
  // Chrome hands back a JSON *string*, not the object that was registered.
  expect(descriptors.find((d) => d.name === "get_scenario")?.schemaType).toBe("string");
});

test("executeTool rejects object arguments", async ({ page }) => {
  await loadStoryReport(page, createRun());
  const rejected = await page.evaluate(async () => {
    const tools = await document.modelContext!.getTools();
    const tool = tools.find((t) => t.name === "get_failing_scenarios")!;
    try {
      await (
        document.modelContext!.executeTool as unknown as (
          t: unknown,
          i: unknown,
        ) => Promise<string>
      )(tool, {});
      return "resolved";
    } catch (error) {
      return (error as { name?: string }).name ?? "unknown";
    }
  });
  expect(rejected).not.toBe("resolved");
});

test("a real agent call answers with the failure and moves the page", async ({ page }) => {
  await loadStoryReport(page, createRun());

  const failures = await callTool(page, "get_failing_scenarios");
  expect(failures["total"]).toBe(1);
  expect(JSON.stringify(failures)).toContain("got 402");

  await callTool(page, "filter_scenarios", { status: "passed" });
  await expect(page.getByText(/An agent filtered this report/)).toBeVisible();
  await expect(page.getByText("No scenarios match the search.")).toBeVisible();
});
