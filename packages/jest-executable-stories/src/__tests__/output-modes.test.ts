/**
 * Tests for flexible output modes: colocated, aggregated, mixed rules.
 * Uses integration tests that spawn Vitest with fixture configs and assert output.
 */
import * as fs from "node:fs/promises";
import path from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { runVitest } from "./helpers/command.js";

const fixturesDir = path.resolve(process.cwd(), "src", "__tests__", "fixtures");

describe("Output modes", () => {
  describe("colocated mode", () => {
    const configPath = path.join(fixturesDir, "output-modes", "colocated", "vitest.config.mts");
    const colocatedOutputPath = path.join(fixturesDir, "output-modes", "colocated", "story.story.docs.md");

    beforeAll(async () => {
      await fs.rm(colocatedOutputPath, { force: true });
    });

    it("writes colocated .docs.md next to test file", async () => {
      const result = runVitest(configPath, {
        GITHUB_ACTIONS: undefined,
      });

      if (result.stderr?.length) console.log(result.stderr);
      if (result.stdout?.length) console.log(result.stdout);
      expect(result.status).toBe(0);

      const raw = await fs.readFile(colocatedOutputPath, "utf-8");
      expect(raw).toContain("# User Stories");
      expect(raw).toContain("User logs in");
      expect(raw).toContain("**Given** user is on login page");
    });
  });

  describe("aggregated mode with output option", () => {
    const configPath = path.join(fixturesDir, "output-modes", "aggregated", "vitest.config.mts");
    const outputPath = path.join(fixturesDir, "output-modes", "aggregated", "dist", "stories.md");

    beforeAll(async () => {
      await fs.rm(path.dirname(outputPath), { recursive: true, force: true });
    });

    it("aggregates matched files into single output using output option", async () => {
      const result = runVitest(configPath, {
        GITHUB_ACTIONS: undefined,
      });

      if (result.stderr?.length) console.log(result.stderr);
      if (result.stdout?.length) console.log(result.stdout);
      expect(result.status).toBe(0);

      const raw = await fs.readFile(outputPath, "utf-8");
      expect(raw).toContain("# User Stories");
      expect(raw).toContain("User logs in");
      expect(raw).toContain("**Given** user is on login page");
    });
  });

  describe("mixed mode rules", () => {
    const configPath = path.join(fixturesDir, "output-modes", "mixed", "vitest.config.mts");
    const featuresColocated = path.join(fixturesDir, "output-modes", "mixed", "features", "login.story.docs.md");
    const e2eAggregated = path.join(fixturesDir, "output-modes", "mixed", "dist", "e2e-stories.md");
    const defaultAggregated = path.join(fixturesDir, "output-modes", "mixed", "dist", "other-stories.md");

    beforeAll(async () => {
      await fs.rm(featuresColocated, { force: true });
      await fs.rm(path.join(fixturesDir, "output-modes", "mixed", "dist"), { recursive: true, force: true });
    });

    it("applies first matching rule and routes scenarios correctly", async () => {
      const result = runVitest(configPath, {
        GITHUB_ACTIONS: undefined,
      });

      if (result.stderr?.length) console.log(result.stderr);
      if (result.stdout?.length) console.log(result.stdout);
      expect(result.status).toBe(0);

      // Features should be colocated
      const featuresContent = await fs.readFile(featuresColocated, "utf-8");
      expect(featuresContent).toContain("# User Stories");
      expect(featuresContent).toContain("User logs in");

      // E2E should be aggregated
      const e2eContent = await fs.readFile(e2eAggregated, "utf-8");
      expect(e2eContent).toContain("# User Stories");
      expect(e2eContent).toContain("E2E checkout flow");

      // Other/unmatched should go to default
      const otherContent = await fs.readFile(defaultAggregated, "utf-8");
      expect(otherContent).toContain("# User Stories");
      expect(otherContent).toContain("Other scenario");
    });
  });

  describe("custom extension", () => {
    const configPath = path.join(fixturesDir, "output-modes", "custom-extension", "vitest.config.mts");
    const customExtOutput = path.join(fixturesDir, "output-modes", "custom-extension", "story.story.md");

    beforeAll(async () => {
      await fs.rm(customExtOutput, { force: true });
    });

    it("uses custom extension for colocated output", async () => {
      const result = runVitest(configPath, {
        GITHUB_ACTIONS: undefined,
      });

      if (result.stderr?.length) console.log(result.stderr);
      if (result.stdout?.length) console.log(result.stdout);
      expect(result.status).toBe(0);

      const raw = await fs.readFile(customExtOutput, "utf-8");
      expect(raw).toContain("# User Stories");
      expect(raw).toContain("User logs in");
    });
  });

  describe("string output shorthand", () => {
    const configPath = path.join(fixturesDir, "vitest.config.mts");
    const outputPath = path.join(fixturesDir, "dist", "user-stories.md");

    beforeAll(async () => {
      await fs.rm(path.dirname(outputPath), { recursive: true, force: true });
    });

    it("writes to single file when output is a string path", async () => {
      const result = runVitest(configPath, {
        GITHUB_ACTIONS: undefined,
      });

      if (result.stderr?.length) console.log(result.stderr);
      if (result.stdout?.length) console.log(result.stdout);
      expect(result.status).toBe(0);

      const raw = await fs.readFile(outputPath, "utf-8");
      expect(raw).toContain("# User Stories");
      expect(raw).toContain("User logs in");
    });
  });
});
