/**
 * Integration test for metadata output block.
 */
import * as fs from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runVitest } from "./helpers/command.js";

const fixturesDir = path.resolve(process.cwd(), "src", "__tests__", "fixtures", "metadata");
const configPath = path.join(fixturesDir, "vitest.config.mts");
const outputPath = path.join(fixturesDir, "dist", "metadata.md");
const jsonOutputPath = path.join(fixturesDir, "dist", "metadata.json");

describe("Metadata output", () => {
  beforeAll(async () => {
    await fs.rm(path.dirname(outputPath), { recursive: true, force: true });
  });

  it("renders metadata table with date and package version", async () => {
    const result = runVitest(configPath, {
      GITHUB_ACTIONS: undefined,
    });

    if (result.stderr?.length) console.log(result.stderr);
    if (result.stdout?.length) console.log(result.stdout);
    expect(result.status).toBe(0);

    const raw = await fs.readFile(outputPath, "utf-8");
    const pkg = JSON.parse(await fs.readFile(path.resolve(process.cwd(), "package.json"), "utf-8")) as {
      version?: string;
    };

    expect(raw).toContain("---");
    expect(raw).toContain("repoRoot:");
    expect(raw).toContain("# Metadata Report");
    expect(raw).toContain("Generated for metadata validation.");
    expect(raw).toContain("| Key | Value |");
    expect(raw).toMatch(/\| Date \| \d{4}-\d{2}-\d{2}T/);
    if (pkg.version) {
      expect(raw).toContain(`| Version | ${pkg.version} |`);
    }

    const jsonRaw = await fs.readFile(jsonOutputPath, "utf-8");
    const json = JSON.parse(jsonRaw) as { meta?: { title?: string }; scenarios?: unknown[] };
    expect(json.meta?.title).toBe("Metadata Report");
    expect(Array.isArray(json.scenarios)).toBe(true);
  });
});
