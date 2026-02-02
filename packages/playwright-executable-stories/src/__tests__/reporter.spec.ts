/**
 * Integration test for StoryReporter: run Playwright with a fixture config that uses
 * the reporter, then assert the generated report has the expected structure.
 */
import * as fs from "node:fs/promises";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { runPlaywright } from "./helpers/command.js";

const fixtureConfig = path.resolve(
  process.cwd(),
  "src",
  "__tests__",
  "fixtures",
  "playwright.config.ts",
);
const outputPath = path.resolve(
  process.cwd(),
  "src",
  "__tests__",
  "fixtures",
  "dist",
  "user-stories.md",
);
const failureFixtureConfig = path.resolve(
  process.cwd(),
  "src",
  "__tests__",
  "fixtures",
  "failure",
  "playwright.config.ts",
);
const failureNoErrorConfig = path.resolve(
  process.cwd(),
  "src",
  "__tests__",
  "fixtures",
  "failure",
  "playwright.no-error.config.ts",
);
const failureOutputPath = path.resolve(
  process.cwd(),
  "src",
  "__tests__",
  "fixtures",
  "failure",
  "dist",
  "user-stories.md",
);
const failureNoErrorOutputPath = path.resolve(
  process.cwd(),
  "src",
  "__tests__",
  "fixtures",
  "failure",
  "dist",
  "user-stories-no-error.md",
);

test.describe("StoryReporter", () => {
  test.beforeAll(async () => {
    await fs.rm(path.dirname(outputPath), { recursive: true, force: true });
  });

  test("writes a report with title, scenario header, and steps when Playwright runs story tests", async () => {
    const result = runPlaywright(fixtureConfig, {
      GITHUB_ACTIONS: undefined,
      GITHUB_SERVER_URL: undefined,
      GITHUB_REPOSITORY: undefined,
      GITHUB_SHA: undefined,
      GITHUB_WORKSPACE: undefined,
    });

    if (result.stderr?.length) console.log(result.stderr);
    if (result.stdout?.length) console.log(result.stdout);
    expect(result.status).toBe(0);

    const raw = await fs.readFile(outputPath, "utf-8");

    expect(raw).toContain("# User Stories");
    expect(raw).toMatch(/#+ .*User logs in/);
    expect(raw).toContain("**Given** user is on login page");
    expect(raw).toContain("**When** user submits valid credentials");
    expect(raw).toContain("**Then** user sees the dashboard");

    // Doc-only story from doc.story(title, task) - no steps, just scenario title
    expect(raw).toMatch(/#+ .*User logs in \(framework native\)/);
    // Doc-only stories no longer have a duplicated "Given" step

    expect(raw).toMatch(/#+ .*Alt API story/);
    expect(raw).toContain("**Given** first precondition");
    expect(raw).toContain("**And** second precondition");
    expect(raw).toContain("**And** third precondition");
    expect(raw).toContain("**When** user acts");
    expect(raw).toContain("**And** user confirms");
    expect(raw).toContain("**And** action completes");
    expect(raw).toContain("**Then** result appears");
    expect(raw).toContain("**And** result is persisted");
    expect(raw).toContain("**And** result is verified");

    expect(raw).toMatch(/#+ .*Optional step callback story/);
    expect(raw).toContain("**Given** precondition with no impl");
    expect(raw).toContain("**And** arrange-only step");
    expect(raw).toContain("**When** action with no impl");
    expect(raw).toContain("**Then** outcome with no impl");
  });

  test("writes doc entries when scenario uses doc API", async () => {
    const result = runPlaywright(fixtureConfig, {
      GITHUB_ACTIONS: undefined,
      GITHUB_SERVER_URL: undefined,
      GITHUB_REPOSITORY: undefined,
      GITHUB_SHA: undefined,
      GITHUB_WORKSPACE: undefined,
    });

    expect(result.status).toBe(0);

    const raw = await fs.readFile(outputPath, "utf-8");

    expect(raw).toContain("_Note:_ This is a static note");
    expect(raw).toContain("**Test user:** admin@example.com");
    expect(raw).toContain("**Captured value:** captured-at-runtime");
    expect(raw).toContain("**Request payload**");
    expect(raw).toContain('"action": "login"');
  });

  test("output rules: writes colocated and aggregated files when using output option", async () => {
    const mixedConfig = path.resolve(
      process.cwd(),
      "src",
      "__tests__",
      "fixtures",
      "output-modes",
      "mixed",
      "playwright.config.ts",
    );
    const featuresColocated = path.resolve(
      process.cwd(),
      "src",
      "__tests__",
      "fixtures",
      "output-modes",
      "mixed",
      "features",
      "login.docs.md",
    );
    const e2eAggregated = path.resolve(
      process.cwd(),
      "src",
      "__tests__",
      "fixtures",
      "output-modes",
      "mixed",
      "dist",
      "e2e-stories.md",
    );
    const defaultAggregated = path.resolve(
      process.cwd(),
      "src",
      "__tests__",
      "fixtures",
      "output-modes",
      "mixed",
      "dist",
      "other-stories.md",
    );

    await fs.rm(path.dirname(e2eAggregated), { recursive: true, force: true });
    await fs.rm(featuresColocated, { force: true });

    const result = runPlaywright(mixedConfig, {
      GITHUB_ACTIONS: undefined,
      GITHUB_SERVER_URL: undefined,
      GITHUB_REPOSITORY: undefined,
      GITHUB_SHA: undefined,
      GITHUB_WORKSPACE: undefined,
    });

    if (result.stderr?.length) console.log(result.stderr);
    if (result.stdout?.length) console.log(result.stdout);
    expect(result.status).toBe(0);

    const featuresContent = await fs.readFile(featuresColocated, "utf-8");
    expect(featuresContent).toContain("# User Stories");
    expect(featuresContent).toContain("User logs in");

    const e2eContent = await fs.readFile(e2eAggregated, "utf-8");
    expect(e2eContent).toContain("# User Stories");
    expect(e2eContent).toContain("E2E checkout flow");

    const otherContent = await fs.readFile(defaultAggregated, "utf-8");
    expect(otherContent).toContain("# User Stories");
    expect(otherContent).toContain("Other scenario");
  });

  test("includes failure error in markdown when scenario fails (includeErrorInMarkdown default)", async () => {
    await fs.rm(path.dirname(failureOutputPath), { recursive: true, force: true });
    const result = runPlaywright(failureFixtureConfig, {
      GITHUB_ACTIONS: undefined,
      GITHUB_SERVER_URL: undefined,
      GITHUB_REPOSITORY: undefined,
      GITHUB_SHA: undefined,
      GITHUB_WORKSPACE: undefined,
    });
    expect(result.status).not.toBe(0);
    const raw = await fs.readFile(failureOutputPath, "utf-8");
    expect(raw).toContain("**Failure**");
    expect(raw).toMatch(/Expected:.*42/);
    expect(raw).toMatch(/Received:.*1/);
    expect(raw).toContain("Calculator multiplies two numbers");
    expect(raw).toContain("**Then** the result is 42");
  });

  test("omits failure block when includeErrorInMarkdown is false", async () => {
    await fs.rm(path.dirname(failureNoErrorOutputPath), { recursive: true, force: true });
    const result = runPlaywright(failureNoErrorConfig, {
      GITHUB_ACTIONS: undefined,
      GITHUB_SERVER_URL: undefined,
      GITHUB_REPOSITORY: undefined,
      GITHUB_SHA: undefined,
      GITHUB_WORKSPACE: undefined,
    });
    expect(result.status).not.toBe(0);
    const raw = await fs.readFile(failureNoErrorOutputPath, "utf-8");
    expect(raw).toContain("Calculator multiplies two numbers");
    expect(raw).toContain("**Then** the result is 42");
    expect(raw).not.toContain("**Failure**");
  });
});
