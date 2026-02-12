/**
 * Integration test for StoryReporter: run Jest with fixture config that uses
 * the reporter, then assert the generated report has the expected structure.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "@jest/globals";
import { runJest } from "./helpers/command";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "fixtures");
const fixtureConfig = path.join(fixturesDir, "jest.config.mjs");
const outputPath = path.join(fixturesDir, "dist", "user-stories.md");
const artifactsDir = path.resolve(process.cwd(), ".jest-executable-stories");

describe("StoryReporter", () => {
  beforeAll(async () => {
    await fs.rm(path.dirname(outputPath), { recursive: true, force: true }).catch(() => {});
    await fs.rm(artifactsDir, { recursive: true, force: true }).catch(() => {});
  });

  it("writes aggregated report with title, scenario headers, and steps when Jest runs story tests", async () => {
    const result = runJest(fixtureConfig, {
      GITHUB_ACTIONS: undefined,
      GITHUB_SHA: undefined,
    });

    if (result.stderr?.length) console.log(result.stderr);
    expect(result.status).toBe(0);

    const raw = await fs.readFile(outputPath, "utf-8");

    expect(raw).toContain("# User Stories");
    expect(raw).toMatch(/## .*colocated\.story\.test/);
    expect(raw).toContain("**Given** two numbers 5 and 3");
    expect(raw).toContain("**When** they are added");
    expect(raw).toContain("**Then** the result is 8");
    expect(raw).toContain("**Given** two numbers 10 and 4");
    expect(raw).toContain("**Then** the result is 6");
    expect(raw).toContain("story with note and tags");
    expect(raw).toContain("> This scenario uses doc methods.");
    expect(raw).toMatch(/\bTags:.*smoke/);
    expect(raw).toMatch(/\bTickets:.*T-1/);
  });
});
