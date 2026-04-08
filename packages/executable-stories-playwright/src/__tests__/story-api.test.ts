/**
 * Tests for the Playwright story API.
 *
 * These tests verify that the story API correctly builds StoryMeta
 * and attaches it to testInfo.annotations for the reporter to consume.
 */
import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as executableStories from "../index";
import { story } from "../story-api";
import type { StoryMeta } from "../types";

/**
 * Helper to get story meta from testInfo annotations.
 */
function getStoryMeta(testInfo: { annotations: Array<{ type: string; description?: string }> }): StoryMeta | undefined {
  const annotation = testInfo.annotations.find((a) => a.type === "story-meta");
  if (!annotation?.description) return undefined;
  return JSON.parse(annotation.description);
}

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test.describe("public API surface", () => {
  test("exports top-level step helpers", () => {
    expect(typeof executableStories.given).toBe("function");
    expect(typeof executableStories.when).toBe("function");
    expect(typeof executableStories.then).toBe("function");
    expect(typeof executableStories.and).toBe("function");
    expect(typeof executableStories.but).toBe("function");
  });
});

test.describe("type contracts", () => {
  test("fixture-aware step callback usage compiles", () => {
    const fixtureTypecheckFile = path.join(
      packageRoot,
      "tmp-fixture-callback-contract.ts",
    );

    fs.writeFileSync(
      fixtureTypecheckFile,
      [
        "import { story } from './src/index';",
        "import type { TestInfo } from '@playwright/test';",
        "",
        "declare const testInfo: TestInfo;",
        "declare const page: unknown;",
        "",
        "story.init({ page }, testInfo);",
        "story.given('fixture step', async ({ page }) => {",
        "  void page;",
        "});",
        "",
      ].join("\n"),
      "utf8",
    );

    try {
      const tscResult = spawnSync(
        "pnpm",
        [
          "exec",
          "tsc",
          "--noEmit",
          "--pretty",
          "false",
          "--target",
          "ES2022",
          "--module",
          "ESNext",
          "--moduleResolution",
          "Bundler",
          "--esModuleInterop",
          "--skipLibCheck",
          fixtureTypecheckFile,
        ],
        { cwd: packageRoot, encoding: "utf8" },
      );

      expect(
        tscResult.status,
        `tsc failed:\n${tscResult.stdout}\n${tscResult.stderr}`,
      ).toBe(0);
      expect(tscResult.stdout).toBe("");
    } finally {
      fs.unlinkSync(fixtureTypecheckFile);
    }
  });

  test("README fixture callback example compiles in strict TypeScript", () => {
    const fixtureTypecheckFile = path.join(
      packageRoot,
      "tmp-fixture-callback-strict-contract.ts",
    );
    const fixtureTsconfigFile = path.join(
      packageRoot,
      "tmp-fixture-tsconfig.json",
    );

    fs.writeFileSync(
      fixtureTypecheckFile,
      [
        "import { story } from './src/index';",
        "import type { TestInfo } from '@playwright/test';",
        "",
        "declare const testInfo: TestInfo;",
        "declare const page: { goto(url: string): Promise<void> };",
        "",
        "story.init({ page }, testInfo);",
        "story.given('user is on login page', async ({ page }) => {",
        "  await page.goto('/login');",
        "});",
        "",
      ].join("\n"),
      "utf8",
    );

    // Use a tsconfig that extends the project config so workspace deps resolve.
    // Only include the fixture file (tsc follows imports automatically).
    // Exclude reporter.ts which has extra transitive deps not needed here.
    fs.writeFileSync(
      fixtureTsconfigFile,
      JSON.stringify({
        extends: "./tsconfig.json",
        compilerOptions: {
          strict: true,
          noEmit: true,
          rootDir: "..",
          baseUrl: ".",
          paths: {
            "executable-stories-formatters": [
              "../executable-stories-formatters/src/index.ts",
            ],
          },
        },
        include: [fixtureTypecheckFile],
        exclude: ["node_modules", "dist", "src/__tests__", "src/reporter.ts"],
      }),
      "utf8",
    );

    try {
      const tscResult = spawnSync(
        "pnpm",
        [
          "exec",
          "tsc",
          "--project",
          fixtureTsconfigFile,
          "--pretty",
          "false",
        ],
        { cwd: packageRoot, encoding: "utf8" },
      );

      expect(
        tscResult.status,
        `tsc failed:\n${tscResult.stdout}\n${tscResult.stderr}`,
      ).toBe(0);
    } finally {
      fs.unlinkSync(fixtureTypecheckFile);
      if (fs.existsSync(fixtureTsconfigFile))
        fs.unlinkSync(fixtureTsconfigFile);
    }
  });
});

test.describe("story.init()", () => {
  test("creates StoryMeta from testInfo.title", async ({}, testInfo) => {
    story.init(testInfo);

    const meta = getStoryMeta(testInfo);
    expect(meta).toBeDefined();
    expect(meta!.scenario).toBe("creates StoryMeta from testInfo.title");
    expect(meta!.steps).toEqual([]);
  });

  test("accepts options with tags", async ({}, testInfo) => {
    story.init(testInfo, { tags: ["admin", "security"] });

    const meta = getStoryMeta(testInfo);
    expect(meta!.tags).toEqual(["admin", "security"]);
  });

  test("accepts options with single ticket", async ({}, testInfo) => {
    story.init(testInfo, { ticket: "JIRA-123" });

    const meta = getStoryMeta(testInfo);
    expect(meta!.tickets).toEqual([{ id: "JIRA-123" }]);
  });

  test("accepts options with multiple tickets", async ({}, testInfo) => {
    story.init(testInfo, { ticket: ["JIRA-123", "JIRA-456"] });

    const meta = getStoryMeta(testInfo);
    expect(meta!.tickets).toEqual([{ id: "JIRA-123" }, { id: "JIRA-456" }]);
  });

  test("accepts options with meta", async ({}, testInfo) => {
    story.init(testInfo, { meta: { priority: "high", team: "platform" } });

    const meta = getStoryMeta(testInfo);
    expect(meta!.meta).toEqual({ priority: "high", team: "platform" });
  });
});

test.describe("story step markers", () => {
  test("adds Given step", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("two numbers 5 and 3");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
    expect(meta!.steps[0]).toMatchObject({
      keyword: "Given",
      text: "two numbers 5 and 3",
      docs: [],
    });
  });

  test("adds When step", async ({}, testInfo) => {
    story.init(testInfo);
    story.when("I add them together");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
    expect(meta!.steps[0]).toMatchObject({
      keyword: "When",
      text: "I add them together",
      docs: [],
    });
  });

  test("adds Then step", async ({}, testInfo) => {
    story.init(testInfo);
    story.then("the result is 8");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
    expect(meta!.steps[0]).toMatchObject({
      keyword: "Then",
      text: "the result is 8",
      docs: [],
    });
  });

  test("adds And step", async ({}, testInfo) => {
    story.init(testInfo);
    story.and("another condition");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("And");
  });

  test("adds But step", async ({}, testInfo) => {
    story.init(testInfo);
    story.but("not this condition");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("But");
  });

  test("builds full Given/When/Then sequence", async ({}, testInfo) => {
    story.init(testInfo);

    story.given("two numbers 5 and 3");
    story.when("I add them together");
    story.then("the result is 8");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(3);
    expect(meta!.steps.map((s) => s.keyword)).toEqual(["Given", "When", "Then"]);
    expect(meta!.steps.map((s) => s.text)).toEqual([
      "two numbers 5 and 3",
      "I add them together",
      "the result is 8",
    ]);
  });
});

test.describe("story step aliases", () => {
  test("arrange is alias for Given", async ({}, testInfo) => {
    story.init(testInfo);
    story.arrange("setup state");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("Given");
  });

  test("act is alias for When", async ({}, testInfo) => {
    story.init(testInfo);
    story.act("perform action");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("When");
  });

  test("assert is alias for Then", async ({}, testInfo) => {
    story.init(testInfo);
    story.assert("verify result");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("Then");
  });

  test("setup/context are aliases for Given", async ({}, testInfo) => {
    story.init(testInfo);
    story.setup("initial state");
    story.context("additional context");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("Given");
    expect(meta!.steps[1].keyword).toBe("And");
  });

  test("execute/action are aliases for When", async ({}, testInfo) => {
    story.init(testInfo);
    story.execute("run operation");
    story.action("perform action");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("When");
    expect(meta!.steps[1].keyword).toBe("And");
  });

  test("verify is alias for Then", async ({}, testInfo) => {
    story.init(testInfo);
    story.verify("check outcome");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("Then");
  });
});

test.describe("step with inline docs", () => {
  test("adds json inline doc", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("valid credentials", {
      json: { label: "Credentials", value: { email: "test@example.com", password: "***" } },
    });

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0];
    expect(step.docs).toHaveLength(1);
    expect(step.docs![0].kind).toBe("code");
    const codeEntry = step.docs![0] as { kind: "code"; label: string; lang: string; content: string };
    expect(codeEntry.label).toBe("Credentials");
    expect(codeEntry.lang).toBe("json");
    expect(JSON.parse(codeEntry.content)).toEqual({
      email: "test@example.com",
      password: "***",
    });
  });

  test("adds note inline doc", async ({}, testInfo) => {
    story.init(testInfo);
    story.then("user is authenticated", {
      note: "Session cookie is set",
    });

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0];
    expect(step.docs).toHaveLength(1);
    expect(step.docs![0]).toEqual({
      kind: "note",
      text: "Session cookie is set",
      phase: "runtime",
    });
  });

  test("adds multiple inline docs", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("order data", {
      json: { label: "Order", value: { id: 123 } },
      note: "Order ID is auto-generated",
      tag: "order",
    });

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0];
    expect(step.docs).toHaveLength(3);
    expect(step.docs!.map((d) => d.kind)).toContain("code");
    expect(step.docs!.map((d) => d.kind)).toContain("note");
    expect(step.docs!.map((d) => d.kind)).toContain("tag");
  });

  test("adds table inline doc", async ({}, testInfo) => {
    story.init(testInfo);
    story.then("items are listed", {
      table: {
        label: "Items",
        columns: ["Item", "Qty"],
        rows: [["Widget", "1"], ["Gadget", "2"]],
      },
    });

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0];
    expect(step.docs).toHaveLength(1);
    expect(step.docs![0].kind).toBe("table");
  });

  test("adds kv inline docs", async ({}, testInfo) => {
    story.init(testInfo);
    story.when("payment processed", {
      kv: { "Payment ID": "pay_123", Amount: "$99.99" },
    });

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0];
    expect(step.docs).toHaveLength(2);
    expect(step.docs!.every((d) => d.kind === "kv")).toBe(true);
  });

  test("adds link inline doc", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("API endpoint", {
      link: { label: "API Docs", url: "https://docs.example.com" },
    });

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0];
    expect(step.docs).toHaveLength(1);
    expect(step.docs![0]).toEqual({
      kind: "link",
      label: "API Docs",
      url: "https://docs.example.com",
      phase: "runtime",
    });
  });
});

test.describe("standalone doc methods", () => {
  test("story.note() after step attaches to step", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("precondition");
    story.note("This is important");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0].kind).toBe("note");
  });

  test("story.note() before steps attaches to story-level", async ({}, testInfo) => {
    story.init(testInfo);
    story.note("This test requires a running database");
    story.given("database is seeded");

    const meta = getStoryMeta(testInfo);
    expect(meta!.docs).toHaveLength(1);
    expect(meta!.docs![0]).toEqual({
      kind: "note",
      text: "This test requires a running database",
      phase: "runtime",
    });
    expect(meta!.steps[0].docs).toHaveLength(0);
  });

  test("story.link() before steps attaches to story-level", async ({}, testInfo) => {
    story.init(testInfo);
    story.link({ label: "API Docs", url: "https://docs.example.com/api" });
    story.given("API is available");

    const meta = getStoryMeta(testInfo);
    expect(meta!.docs).toHaveLength(1);
    expect(meta!.docs![0].kind).toBe("link");
  });

  test("story.kv() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.when("payment is processed");
    story.kv({ label: "Payment ID", value: "pay_abc123" });
    story.kv({ label: "Amount", value: "$99.99" });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(2);
    expect(meta!.steps[0].docs!.every((d) => d.kind === "kv")).toBe(true);
  });

  test("story.json() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("an order exists");
    story.json({ label: "Order", value: { id: 123, items: ["widget", "gadget"] } });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0].kind).toBe("code");
    const entry = meta!.steps[0].docs![0] as { kind: "code"; lang: string };
    expect(entry.lang).toBe("json");
  });

  test("story.table() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.then("order is confirmed");
    story.table({
      label: "Order Summary",
      columns: ["Item", "Qty", "Price"],
      rows: [["Widget", "1", "$49.99"], ["Gadget", "1", "$50.00"]],
    });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0].kind).toBe("table");
  });

  test("story.code() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("a config file");
    story.code({ label: "Config", content: "port: 3000\nhost: localhost", lang: "yaml" });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    const entry = meta!.steps[0].docs![0] as { kind: "code"; lang: string; content: string };
    expect(entry.kind).toBe("code");
    expect(entry.lang).toBe("yaml");
    expect(entry.content).toBe("port: 3000\nhost: localhost");
  });

  test("story.mermaid() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.when("workflow executes");
    story.mermaid({ code: "graph LR\n  A-->B-->C", title: "Workflow" });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0].kind).toBe("mermaid");
  });

  test("story.screenshot() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.then("page renders correctly");
    story.screenshot({ path: "/screenshots/result.png", alt: "Final result" });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0]).toEqual({
      kind: "screenshot",
      path: "/screenshots/result.png",
      alt: "Final result",
      phase: "runtime",
    });
  });

  test("story.tag() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("admin user");
    story.tag(["admin", "elevated"]);

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0]).toEqual({
      kind: "tag",
      names: ["admin", "elevated"],
      phase: "runtime",
    });
  });

  test("story.custom() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("custom data");
    story.custom({ type: "myType", data: { foo: "bar" } });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0]).toEqual({
      kind: "custom",
      type: "myType",
      data: { foo: "bar" },
      phase: "runtime",
    });
  });

  test("story.section() attaches to current step", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("complex setup");
    story.section({ title: "Details", markdown: "This is **markdown** content" });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0]).toEqual({
      kind: "section",
      title: "Details",
      markdown: "This is **markdown** content",
      phase: "runtime",
    });
  });
});

test.describe("story.fn() - step wrapper", () => {
  test("wraps a sync function as a step with wrapped: true", async ({}, testInfo) => {
    story.init(testInfo);
    const result = story.fn("Given", "two numbers", () => ({ a: 5, b: 3 }));

    expect(result).toEqual({ a: 5, b: 3 });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
    const step = meta!.steps[0] as { keyword: string; text: string; wrapped?: boolean };
    expect(step.keyword).toBe("Given");
    expect(step.text).toBe("two numbers");
    expect(step.wrapped).toBe(true);
  });

  test("wraps an async function", async ({}, testInfo) => {
    story.init(testInfo);
    const result = await story.fn("When", "compute", async () => 5 + 3);

    expect(result).toBe(8);
    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0] as { keyword: string; wrapped?: boolean };
    expect(step.keyword).toBe("When");
    expect(step.wrapped).toBe(true);
  });

  test("records durationMs on the step", async ({}, testInfo) => {
    story.init(testInfo);
    story.fn("Given", "setup", () => {});

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0] as { durationMs?: number };
    expect(typeof step.durationMs).toBe("number");
    expect(step.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("re-throws errors from the wrapped function", async ({}, testInfo) => {
    story.init(testInfo);
    expect(() => story.fn("When", "boom", () => { throw new Error("kaboom"); })).toThrow("kaboom");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
  });

  test("syncs annotation after fn completes", async ({}, testInfo) => {
    story.init(testInfo);
    story.fn("Given", "step one", () => {});

    // Verify annotation was synced (meta in annotation should include the step)
    const annotation = testInfo.annotations.find((a) => a.type === "story-meta");
    const meta = JSON.parse(annotation!.description!);
    expect(meta.steps).toHaveLength(1);
    expect(meta.steps[0].wrapped).toBe(true);
    expect(typeof meta.steps[0].durationMs).toBe("number");
  });

  test("integrates markers and fn in a full scenario", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("user is logged in");
    const data = story.fn("When", "submit form", () => ({ id: 1 }));
    story.fn("Then", "response is valid", () => { expect(data.id).toBe(1); });

    const meta = getStoryMeta(testInfo);
    const steps = meta!.steps as Array<{ wrapped?: boolean }>;
    expect(steps).toHaveLength(3);
    expect(steps[0].wrapped).toBeUndefined();
    expect(steps[1].wrapped).toBe(true);
    expect(steps[2].wrapped).toBe(true);
  });

  test("auto-converts repeated primary keywords for story.fn, including with markers", async ({}, testInfo) => {
    story.init(testInfo);

    story.fn("Given", "first precondition", () => 1);
    story.given("second precondition marker-only");
    story.fn("When", "first action", () => "a");
    story.when("second action marker-only");
    story.fn("Then", "first assertion", () => true);
    story.then("second assertion marker-only");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps.map((step) => step.keyword)).toEqual([
      "Given",
      "And",
      "When",
      "And",
      "Then",
      "And",
    ]);
  });

  test("auto-converts repeated primary keywords when using story.fn only", async ({}, testInfo) => {
    story.init(testInfo);

    story.fn("Given", "first precondition", () => 1);
    story.fn("Given", "second precondition", () => 2);
    story.fn("When", "first action", () => "a");
    story.fn("When", "second action", () => "b");
    story.fn("Then", "first assertion", () => true);
    story.fn("Then", "second assertion", () => true);

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps.map((step) => step.keyword)).toEqual([
      "Given",
      "And",
      "When",
      "And",
      "Then",
      "And",
    ]);
  });
});

test.describe("story.expect() - Then wrapper", () => {
  test("wraps assertion as a Then step with wrapped: true", async ({}, testInfo) => {
    story.init(testInfo);
    story.expect("result is correct", () => { expect(8).toBe(8); });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
    const step = meta!.steps[0] as { keyword: string; wrapped?: boolean };
    expect(step.keyword).toBe("Then");
    expect(step.wrapped).toBe(true);
  });

  test("re-throws assertion errors", async ({}, testInfo) => {
    story.init(testInfo);
    expect(() => story.expect("wrong", () => { expect(1).toBe(2); })).toThrow();

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
  });

  test("records durationMs", async ({}, testInfo) => {
    story.init(testInfo);
    story.expect("fast check", () => { expect(true).toBe(true); });

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0] as { durationMs?: number };
    expect(typeof step.durationMs).toBe("number");
  });
});

test.describe("describe and nested describe behavior", () => {
  test.describe("Calculator", () => {
    test.describe("Basic Operations", () => {
      test("extracts suitePath from nested describes", async ({}, testInfo) => {
        story.init(testInfo);
        story.given("two numbers");
        story.when("added");
        story.then("result is correct");

        const meta = getStoryMeta(testInfo);
        expect(meta!.scenario).toBe("extracts suitePath from nested describes");
        // titlePath in Playwright is [projectName, ...describes, testTitle]
        // suitePath should be the describes without project and test name
        expect(meta!.suitePath).toBeDefined();
        expect(meta!.suitePath).toContain("Calculator");
        expect(meta!.suitePath).toContain("Basic Operations");
      });
    });
  });
});

test.describe("step callbacks", () => {
  test("README contract: step callbacks do not receive fixtures when only story.init(testInfo) is called", async ({ page }, testInfo) => {
    story.init(testInfo);

    await story.when("callback without fixtures", async (fixtures: { page?: unknown } | undefined) => {
      expect(fixtures).toBeUndefined();
    });
  });

  test("passes Playwright fixtures into step callback body without extra init options", async ({ page }, testInfo) => {
    story.init({ page }, testInfo);

    await story.when("fixture-aware callback via default init", async (fixtures: { page?: unknown }) => {
      expect(fixtures).toBeDefined();
      expect(fixtures.page).toBe(page);
    });
  });

  test("passes Playwright fixtures into step callback body", async ({ page }, testInfo) => {
    story.init(testInfo, { fixtures: { page } });

    await story.when("fixture-aware callback", async (fixtures: { page?: unknown }) => {
      expect(fixtures).toBeDefined();
      expect(fixtures.page).toBe(page);
    });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].wrapped).toBe(true);
  });

  test("sync callback returns value and records wrapped + durationMs", async ({}, testInfo) => {
    story.init(testInfo);
    const result = story.given("two numbers", () => ({ a: 5, b: 3 }));

    expect(result).toEqual({ a: 5, b: 3 });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
    expect(meta!.steps[0]).toMatchObject({
      keyword: "Given",
      text: "two numbers",
      wrapped: true,
    });
    expect(typeof (meta!.steps[0] as { durationMs?: number }).durationMs).toBe("number");
  });

  test("async callback returns value via await", async ({}, testInfo) => {
    story.init(testInfo);
    const result = await story.when("I fetch data", async () => 42);

    expect(result).toBe(42);

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0]).toMatchObject({
      keyword: "When",
      text: "I fetch data",
      wrapped: true,
    });
    expect(typeof (meta!.steps[0] as { durationMs?: number }).durationMs).toBe("number");
  });

  test("promise-returning fixture callback receives TestStepInfo without requiring async keyword", async ({}, testInfo) => {
    const mockFixtures = { page: {} };
    story.init(mockFixtures, testInfo);

    let capturedStepInfo: unknown;

    const result = await story.when(
      "I return a promise from a fixture callback",
      (_fixtures: { page?: unknown }, step) => {
        capturedStepInfo = step;
        return Promise.resolve(42);
      },
    );

    expect(result).toBe(42);
    expect(capturedStepInfo).toBeDefined();
    expect(typeof (capturedStepInfo as { attach?: unknown })?.attach).toBe("function");
    expect(typeof (capturedStepInfo as { skip?: unknown })?.skip).toBe("function");
  });

  test("void callback returns undefined", async ({}, testInfo) => {
    story.init(testInfo);
    const result = story.then("check passes", () => {
      expect(true).toBe(true);
    });

    expect(result).toBeUndefined();

    const meta = getStoryMeta(testInfo);
    const step = meta!.steps[0] as { wrapped?: boolean };
    expect(step.wrapped).toBe(true);
  });

  test("error in callback re-throws, step still recorded", async ({}, testInfo) => {
    story.init(testInfo);

    expect(() =>
      story.when("failing action", () => {
        throw new Error("boom");
      }),
    ).toThrow("boom");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
    expect(meta!.steps[0].keyword).toBe("When");
    expect((meta!.steps[0] as { wrapped?: boolean }).wrapped).toBe(true);
    expect(typeof (meta!.steps[0] as { durationMs?: number }).durationMs).toBe("number");
  });

  test("backward compat: marker-only still works (no wrapped)", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("a precondition");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].keyword).toBe("Given");
    expect((meta!.steps[0] as { wrapped?: boolean }).wrapped).toBeUndefined();
    expect((meta!.steps[0] as { durationMs?: number }).durationMs).toBeUndefined();
  });

  test("backward compat: inline docs still work", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("valid credentials", {
      note: "Session cookie is set",
    });

    const meta = getStoryMeta(testInfo);
    expect((meta!.steps[0] as { wrapped?: boolean }).wrapped).toBeUndefined();
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0].kind).toBe("note");
  });

  test("integration: mixed markers, callbacks, and docs in one scenario", async ({}, testInfo) => {
    story.init(testInfo);

    story.given("user is logged in");
    const data = story.when("user submits form", () => ({ id: 1 }));
    story.then("response is valid", () => { expect(data.id).toBe(1); });
    story.and("confirmation appears");

    const meta = getStoryMeta(testInfo);
    const steps = meta!.steps as Array<{ wrapped?: boolean }>;
    expect(steps).toHaveLength(4);
    expect(steps[0].wrapped).toBeUndefined();
    expect(steps[1].wrapped).toBe(true);
    expect(steps[2].wrapped).toBe(true);
    expect(steps[3].wrapped).toBeUndefined();
  });

  test("syncs annotation after callback completes", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("step with callback", () => 5);

    const annotation = testInfo.annotations.find((a) => a.type === "story-meta");
    const meta = JSON.parse(annotation!.description!);
    expect(meta.steps).toHaveLength(1);
    expect(meta.steps[0].wrapped).toBe(true);
    expect(typeof meta.steps[0].durationMs).toBe("number");
  });

  test("auto-converts repeated primary callback keywords to And", async ({}, testInfo) => {
    story.init(testInfo);

    story.given("first precondition", () => 1);
    story.given("second precondition", () => 2);
    story.when("first action", () => "a");
    story.when("second action", () => "b");
    story.then("first assertion", () => true);
    story.then("second assertion", () => true);

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps.map((step) => step.keyword)).toEqual([
      "Given",
      "And",
      "When",
      "And",
      "Then",
      "And",
    ]);
  });

  test("auto-converts repeated primary keywords across callback and marker styles", async ({}, testInfo) => {
    story.init(testInfo);

    story.given("first precondition", () => 1);
    story.given("second precondition marker-only");
    story.when("first action", () => "a");
    story.when("second action marker-only");
    story.then("first assertion", () => true);
    story.then("second assertion marker-only");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps.map((step) => step.keyword)).toEqual([
      "Given",
      "And",
      "When",
      "And",
      "Then",
      "And",
    ]);
  });
});

test.describe("doc methods return DocEntry (Task 14)", () => {
  test("note() returns its DocEntry", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("precondition");
    const entry = story.note("important note");

    expect(entry).toEqual({
      kind: "note",
      text: "important note",
      phase: "runtime",
    });
  });

  test("kv() returns its DocEntry", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("precondition");
    const entry = story.kv({ label: "ID", value: "abc" });

    expect(entry).toEqual({
      kind: "kv",
      label: "ID",
      value: "abc",
      phase: "runtime",
    });
  });

  test("json() returns its DocEntry", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("precondition");
    const entry = story.json({ label: "Data", value: { x: 1 } });

    expect(entry.kind).toBe("code");
    expect((entry as { lang?: string }).lang).toBe("json");
  });

  test("note() with children attaches them and deduplicates", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("precondition");

    const child1 = story.kv({ label: "A", value: 1 });
    const child2 = story.kv({ label: "B", value: 2 });
    const parent = story.note("parent note", [child1, child2]);

    expect(parent.children).toHaveLength(2);
    expect(parent.children).toEqual([child1, child2]);

    // Children should be deduplicated from step-level flat docs
    const meta = getStoryMeta(testInfo);
    const stepDocs = meta!.steps[0].docs!;
    // stepDocs should contain only the parent (children removed from flat array)
    expect(stepDocs).toHaveLength(1);
    expect(stepDocs[0]).toMatchObject({ kind: "note", text: "parent note" });
  });

  test("recursive children work (nested nesting)", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("precondition");

    const grandchild = story.kv({ label: "Inner", value: "deep" });
    const child = story.note("mid-level", [grandchild]);
    const parent = story.section({ title: "Top", markdown: "root" }, [child]);

    expect(parent.children).toHaveLength(1);
    expect(parent.children![0]).toMatchObject({ kind: "note", text: "mid-level" });
    expect(child.children).toHaveLength(1);
    expect(child.children![0]).toMatchObject({ kind: "kv", label: "Inner" });

    // Only parent should remain in step docs flat array
    const meta = getStoryMeta(testInfo);
    const stepDocs = meta!.steps[0].docs!;
    expect(stepDocs).toHaveLength(1);
    expect(stepDocs[0]).toMatchObject({ kind: "section", title: "Top" });
  });

  test("children deduplication works at story-level (before any step)", async ({}, testInfo) => {
    story.init(testInfo);

    const child = story.kv({ label: "Key", value: "val" });
    const parent = story.note("story-level parent", [child]);

    const meta = getStoryMeta(testInfo);
    expect(meta!.docs).toHaveLength(1);
    expect(meta!.docs![0]).toMatchObject({ kind: "note", text: "story-level parent" });
    expect(parent.children).toEqual([child]);
  });

  test("reparents children out of earlier steps when a later doc method nests them", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("first step");
    const child = story.note("shared child");

    story.when("second step");
    const parent = story.note("parent note", [child]);

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toEqual([]);
    expect(meta!.steps[1].docs).toEqual([parent]);
    expect(parent.children).toEqual([child]);
  });
});

test.describe("step markers accept DocEntry[] children (Task 14)", () => {
  test("given() accepts DocEntry[] as second param", async ({}, testInfo) => {
    story.init(testInfo);

    const child1 = story.kv({ label: "User", value: "alice" });
    const child2 = story.note("note about user");

    // Now attach as children to a step — note: since no step before, these go to story-level
    // then given() with children should deduplicate from story-level
    story.given("a user exists", [child1, child2]);

    const meta = getStoryMeta(testInfo);
    const givenStep = meta!.steps[0];
    expect(givenStep.keyword).toBe("Given");
    expect(givenStep.text).toBe("a user exists");
    expect(givenStep.docs).toHaveLength(2);
    // story-level docs should be empty (deduplicated)
    expect(meta!.docs ?? []).toHaveLength(0);
  });

  test("when() accepts DocEntry[] and deduplicates from earlier step", async ({}, testInfo) => {
    story.init(testInfo);

    story.given("setup");
    const child = story.kv({ label: "Amount", value: "$50" });

    // child is on the Given step. Now pass it as children to When step.
    story.when("payment processed", [child]);

    const meta = getStoryMeta(testInfo);
    // child should be removed from Given step docs
    expect(meta!.steps[0].docs).toHaveLength(0);
    // child should be on When step
    expect(meta!.steps[1].docs).toHaveLength(1);
  });
});

test.describe("ticket normalization for objects (Task 14)", () => {
  test("normalizes string ticket to { id } object", async ({}, testInfo) => {
    story.init(testInfo, { ticket: "JIRA-123" });

    const meta = getStoryMeta(testInfo);
    expect(meta!.tickets).toEqual([{ id: "JIRA-123" }]);
  });

  test("normalizes object ticket with id and url", async ({}, testInfo) => {
    story.init(testInfo, {
      ticket: { id: "PAY-1042", url: "https://jira.example.com/browse/PAY-1042" },
    });

    const meta = getStoryMeta(testInfo);
    expect(meta!.tickets).toEqual([
      { id: "PAY-1042", url: "https://jira.example.com/browse/PAY-1042" },
    ]);
  });

  test("normalizes mixed array of strings and objects", async ({}, testInfo) => {
    story.init(testInfo, {
      ticket: [
        "JIRA-123",
        { id: "PAY-1042", url: "https://jira.example.com/browse/PAY-1042" },
        "BUG-999",
      ],
    });

    const meta = getStoryMeta(testInfo);
    expect(meta!.tickets).toEqual([
      { id: "JIRA-123" },
      { id: "PAY-1042", url: "https://jira.example.com/browse/PAY-1042" },
      { id: "BUG-999" },
    ]);
  });

  test("returns undefined when no ticket provided", async ({}, testInfo) => {
    story.init(testInfo);

    const meta = getStoryMeta(testInfo);
    expect(meta!.tickets).toBeUndefined();
  });
});
