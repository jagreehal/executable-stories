/**
 * Integration test for StoryReporter: run Vitest with a fixture config that uses
 * the reporter, then assert the generated report has the expected structure.
 * Same pattern as vitest-markdown-reporter: run vitest → read output → assert.
 * @see https://github.com/pecirep/vitest-markdown-reporter/blob/main/src/__tests__/index.test.ts
 */
import * as fs from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runVitest } from "./helpers/command.js";

// Config path must point to source (config is not copied to dist)
const fixtureConfig = path.resolve(process.cwd(), "src", "__tests__", "fixtures", "vitest.config.mts");
// Report is written by the fixture config to src/__tests__/fixtures/dist/user-stories.md
const outputPath = path.resolve(process.cwd(), "src", "__tests__", "fixtures", "dist", "user-stories.md");

const failureFixtureConfig = path.resolve(process.cwd(), "src", "__tests__", "fixtures", "failure", "vitest.config.mts");
const failureNoErrorConfig = path.resolve(process.cwd(), "src", "__tests__", "fixtures", "failure", "vitest.no-error.config.mts");
const failureOutputPath = path.resolve(process.cwd(), "src", "__tests__", "fixtures", "failure", "dist", "user-stories.md");
const failureNoErrorOutputPath = path.resolve(process.cwd(), "src", "__tests__", "fixtures", "failure", "dist", "user-stories-no-error.md");

describe("StoryReporter", () => {
  beforeAll(async () => {
    await fs.rm(path.dirname(outputPath), { recursive: true, force: true });
  });

  it("writes a report with title, scenario header, and steps when Vitest runs story tests", async () => {
    const result = runVitest(fixtureConfig, {
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
    expect(raw).toMatch(/## .* User logs in/);
    expect(raw).toContain("**Given** user is on login page");
    expect(raw).toContain("**When** user submits valid credentials");
    expect(raw).toContain("**Then** user sees the dashboard");

    // Doc-only story from doc.story(title, task) - no steps, just scenario title
    expect(raw).toMatch(/## .* User logs in \(framework native\)/);
    // Doc-only stories no longer have a duplicated "Given" step

    // Alt API story: multiple Given/When/Then → And; arrange interchangeable with given
    expect(raw).toMatch(/## .* Alt API story/);
    expect(raw).toContain("**Given** first precondition");
    expect(raw).toContain("**And** second precondition");
    expect(raw).toContain("**And** third precondition");
    expect(raw).toContain("**When** user acts");
    expect(raw).toContain("**And** user confirms");
    expect(raw).toContain("**And** action completes");
    expect(raw).toContain("**Then** result appears");
    expect(raw).toContain("**And** result is persisted");
    expect(raw).toContain("**And** result is verified");

    expect(raw).toMatch(/## .* Optional step callback story/);
    expect(raw).toContain("**Given** precondition with no impl");
    expect(raw).toContain("**And** arrange-only step");
    expect(raw).toContain("**When** action with no impl");
    expect(raw).toContain("**Then** outcome with no impl");
  });

  it("includes failure error in markdown when scenario fails (includeErrorInMarkdown default)", async () => {
    await fs.rm(path.dirname(failureOutputPath), { recursive: true, force: true });
    const result = runVitest(failureFixtureConfig, {
      GITHUB_ACTIONS: undefined,
      GITHUB_SERVER_URL: undefined,
      GITHUB_REPOSITORY: undefined,
      GITHUB_SHA: undefined,
      GITHUB_WORKSPACE: undefined,
    });
    expect(result.status).not.toBe(0);
    const raw = await fs.readFile(failureOutputPath, "utf-8");
    expect(raw).toContain("**Failure**");
    expect(raw).toMatch(/expected 1 to be 42/);
    expect(raw).toContain("Calculator multiplies two numbers");
    expect(raw).toContain("**Then** the result is 42");
  });

  it("omits failure block when includeErrorInMarkdown is false", async () => {
    await fs.rm(path.dirname(failureNoErrorOutputPath), { recursive: true, force: true });
    const result = runVitest(failureNoErrorConfig, {
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
