/**
 * Tests for ReportGenerator.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { ReportGenerator } from "../../src/index";
import { canonicalizeRun } from "executable-stories-core/converters/acl/index";
import { createRawRun, createMultiFileRun } from "../fixtures/raw-runs/basic";

describe("ReportGenerator", () => {
  it("renders the html format via the React report renderer", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "formatters-"));

    try {
      // The `html` report renders via executable-stories-react (the single
      // report renderer), so the html output is the standalone React
      // report (scoped in `.es-report-island`) with its interactive island.
      const generator = new ReportGenerator({
        formats: ["html"],
        outputDir: tempDir,
        outputName: "report",
        output: { mode: "aggregated" },
      });

      const run = canonicalizeRun(createRawRun());
      const result = await generator.generate(run);
      const htmlPaths = result.get("html");

      expect(htmlPaths).toBeTruthy();
      expect(htmlPaths).toHaveLength(1);

      const html = fs.readFileSync(htmlPaths![0], "utf8");
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("es-report-island");
      // The interactive island JSON payload is embedded for client takeover.
      expect(html).toContain('id="es-report-data"');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should pass markdown groupBy to MarkdownFormatter", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "formatters-"));

    try {
      const generator = new ReportGenerator({
        formats: ["markdown"],
        outputDir: tempDir,
        outputName: "report",
        output: { mode: "aggregated" },
        markdown: {
          groupBy: "none",
        },
      });

      const run = canonicalizeRun(createMultiFileRun());
      const result = await generator.generate(run);
      const mdPaths = result.get("markdown");

      expect(mdPaths).toBeTruthy();
      expect(mdPaths).toHaveLength(1);

      const markdown = fs.readFileSync(mdPaths![0], "utf8");
      expect(markdown).not.toContain("## src/auth/login.test.ts");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
