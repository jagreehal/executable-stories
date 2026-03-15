/**
 * Tests for themed HTML output.
 */

import { describe, it, expect } from "vitest";
import { HtmlFormatter } from "../../../../src/formatters/html/index";
import { getAvailableThemes } from "../../../../src/formatters/html/themes/index";
import { canonicalizeRun } from "../../../../src/converters/acl/index";
import { createRawRun } from "../../../fixtures/raw-runs/basic";

describe("themed HTML output", () => {
  const raw = createRawRun();
  const run = canonicalizeRun(raw);

  it("should produce same output with no theme option as with 'default'", () => {
    const noTheme = new HtmlFormatter();
    const defaultTheme = new HtmlFormatter({ theme: "default" });
    expect(noTheme.format(run)).toBe(defaultTheme.format(run));
  });

  for (const name of getAvailableThemes()) {
    describe(`${name} theme`, () => {
      it("should produce valid HTML", () => {
        const formatter = new HtmlFormatter({ theme: name });
        const result = formatter.format(run);
        expect(result).toContain("<!DOCTYPE html>");
        expect(result).toContain("<html");
        expect(result).toContain("</html>");
      });

      it("should include CSS styles", () => {
        const formatter = new HtmlFormatter({ theme: name });
        const result = formatter.format(run);
        expect(result).toContain("<style>");
        expect(result).toContain("</style>");
      });

      it("should include interactive JavaScript", () => {
        const formatter = new HtmlFormatter({ theme: name });
        const result = formatter.format(run);
        expect(result).toContain("<script>");
        expect(result).toContain("initSearch");
      });
    });
  }

  it("corporate theme should contain sidebar TOC", () => {
    const formatter = new HtmlFormatter({ theme: "corporate" });
    const result = formatter.format(run);
    expect(result).toContain("toc");
  });

  it("dashboard theme should contain sidebar", () => {
    const formatter = new HtmlFormatter({ theme: "dashboard" });
    const result = formatter.format(run);
    expect(result).toContain("db-sidebar");
  });

  it("should accept custom theme objects", () => {
    const formatter = new HtmlFormatter({
      theme: {
        name: "custom",
        label: "Custom",
        css: ":root { --background: #fff; } [data-theme=\"dark\"] { --background: #000; }",
      },
    });
    const result = formatter.format(run);
    expect(result).toContain("<!DOCTYPE html>");
    expect(result).toContain("--background: #fff");
  });
});
