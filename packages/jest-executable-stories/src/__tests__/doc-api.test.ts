/**
 * Tests for the doc API feature.
 */
import { describe, it, expect } from "vitest";
import { story } from "../index.js";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

// Use absolute path to src fixtures (not dist)
const fixturesDir = path.resolve(process.cwd(), "src/__tests__/fixtures/doc-api");

describe("Doc API", () => {
  it("renders static doc.note under step", async () => {
    const configPath = path.join(fixturesDir, "vitest.config.mts");
    const outputPath = path.join(fixturesDir, "dist", "docs.md");

    // Clean up output file if exists
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    // Run vitest with the fixture config
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        "npx",
        ["vitest", "run", "--config", configPath],
        {
          cwd: process.cwd(),
          stdio: ["ignore", "pipe", "pipe"],
        }
      );

      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (data) => { stdout += data.toString(); });
      child.stderr?.on("data", (data) => { stderr += data.toString(); });

      child.on("close", (code) => {
        if (code !== 0) {
          console.log("stdout:", stdout);
          console.log("stderr:", stderr);
        }
        resolve();
      });
      child.on("error", reject);
    });

    // Check the generated markdown
    expect(fs.existsSync(outputPath)).toBe(true);
    const content = fs.readFileSync(outputPath, "utf8");

    // For debugging
    // console.log("Generated content:\n", content);

    // Check for static note (under given step)
    expect(content).toContain("_Note:_ This is a static note");

    // Check for static kv (under given step)
    expect(content).toContain("**Test user:** admin@example.com");

    // Check for runtime kv (captures value from execution, under when step)
    expect(content).toContain("**Captured value:** captured-at-runtime");

    // Check for code block (under when step)
    expect(content).toContain("**Request payload**");
    expect(content).toContain('"action": "login"');

    // Check for table (under then step)
    expect(content).toContain("**Test Matrix**");
    expect(content).toContain("| Browser |");
    expect(content).toContain("| Chrome |");

    // Check for link (under then step)
    expect(content).toContain("[Documentation](https://example.com/docs)");

    // Check static doc on skipped step still appears
    // For skipped steps, the function body is executed during registration
    // to capture static docs
    expect(content).toContain("_Note:_ This note appears even though the step is skipped");
  });
});
