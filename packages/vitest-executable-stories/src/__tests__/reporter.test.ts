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
  });
});
