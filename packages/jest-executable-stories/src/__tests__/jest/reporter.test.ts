/**
 * Integration test for StoryReporter: run Jest with a fixture config that uses
 * the reporter, then assert the generated report has the expected structure.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { beforeAll, describe, expect, it } from "@jest/globals";
import { runJest } from "./helpers/command.js";

const fixturesDir = path.resolve(process.cwd(), "src", "__tests__", "jest", "fixtures");
const fixtureConfig = path.join(fixturesDir, "jest.config.mjs");
const outputPath = path.join(fixturesDir, "dist", "user-stories.md");
const artifactsDir = path.resolve(process.cwd(), ".jest-executable-stories");
const failureFixtureConfig = path.join(fixturesDir, "failure", "jest.config.mjs");
const failureNoErrorConfig = path.join(fixturesDir, "failure", "jest.no-error.config.mjs");
const failureOutputPath = path.join(fixturesDir, "failure", "dist", "user-stories.md");
const failureNoErrorOutputPath = path.join(fixturesDir, "failure", "dist", "user-stories-no-error.md");

describe("StoryReporter (Jest)", () => {
  beforeAll(async () => {
    await fs.rm(path.dirname(outputPath), { recursive: true, force: true });
    await fs.rm(artifactsDir, { recursive: true, force: true });
  });

  it("writes a report with title, scenario header, and steps when Jest runs story tests", async () => {
    const result = runJest(fixtureConfig, {
      GITHUB_ACTIONS: undefined,
      GITHUB_SERVER_URL: undefined,
      GITHUB_REPOSITORY: undefined,
      GITHUB_SHA: undefined,
      GITHUB_WORKSPACE: undefined,
    });

    if (result.stderr?.length) console.log(result.stderr);
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
  });

  it("includes failure error in markdown when scenario fails (includeErrorInMarkdown default)", async () => {
    await fs.rm(path.dirname(failureOutputPath), { recursive: true, force: true });
    await fs.rm(artifactsDir, { recursive: true, force: true });
    const result = runJest(failureFixtureConfig, {
      GITHUB_ACTIONS: undefined,
      GITHUB_SERVER_URL: undefined,
      GITHUB_REPOSITORY: undefined,
      GITHUB_SHA: undefined,
      GITHUB_WORKSPACE: undefined,
    });
    expect(result.status).not.toBe(0);
    const raw = await fs.readFile(failureOutputPath, "utf-8");
    expect(raw).toContain("**Failure**");
    expect(raw).toContain("Expected: 42");
    expect(raw).toContain("Received: 1");
    expect(raw).toContain("Calculator multiplies two numbers");
    expect(raw).toContain("**Then** the result is 42");
  });

  it("omits failure block when includeErrorInMarkdown is false", async () => {
    await fs.rm(path.dirname(failureNoErrorOutputPath), { recursive: true, force: true });
    await fs.rm(artifactsDir, { recursive: true, force: true });
    const result = runJest(failureNoErrorConfig, {
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
