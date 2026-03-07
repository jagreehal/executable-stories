import { describe, it, expect } from "vitest";
import { story } from "executable-stories-vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ReportGenerator } from "../../src/index";
import { canonicalizeRun } from "../../src/converters/acl/index";
import { createRawRun, createMultiFileRun } from "../fixtures/raw-runs/basic";

describe("Report Generator", () => {
  it("generates a markdown report file from a raw run", async ({ task }) => {
    story.init(task);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "formatters-"));

    try {
      story.given("a canonicalized test run and markdown output options");
      const run = canonicalizeRun(createRawRun());
      const generator = new ReportGenerator({
        formats: ["markdown"],
        outputDir: tempDir,
        outputName: "report",
        output: { mode: "aggregated" },
      });

      story.when("the report is generated");
      const result = await generator.generate(run);
      const mdPaths = result.get("markdown");

      story.then("a single markdown file is written");
      expect(mdPaths).toBeTruthy();
      expect(mdPaths).toHaveLength(1);

      story.and("the file contains the formatted story content");
      const markdown = fs.readFileSync(mdPaths![0], "utf8");
      expect(markdown).toContain("# User Stories");
      expect(markdown).toContain("User logs in successfully");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("generates an HTML report with collapsed sections", async ({ task }) => {
    story.init(task);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "formatters-"));

    try {
      story.given("a test run and HTML options with startCollapsed enabled");
      const run = canonicalizeRun(createRawRun());
      const generator = new ReportGenerator({
        formats: ["html"],
        outputDir: tempDir,
        outputName: "report",
        output: { mode: "aggregated" },
        html: { startCollapsed: true },
      });

      story.when("the HTML report is generated");
      const result = await generator.generate(run);
      const htmlPaths = result.get("html");

      story.then("the HTML file contains collapsed feature and scenario sections");
      const html = fs.readFileSync(htmlPaths![0], "utf8");
      expect(html).toContain('class="feature collapsed"');
      expect(html).toContain('class="scenario collapsed"');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
