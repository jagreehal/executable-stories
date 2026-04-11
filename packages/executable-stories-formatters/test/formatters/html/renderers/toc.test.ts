import { describe, it, expect, beforeEach } from "vitest";
import { renderToc } from "../../../../src/formatters/html/renderers/toc";
import { escapeHtml } from "../../../../src/formatters/html/template";
import { stubs } from "../../../stubs";

const baseDeps = {
  escapeHtml,
  getStatusIcon: (status: string) =>
    status === "passed" ? "✓" : status === "failed" ? "✗" : "○",
};

describe("renderToc", () => {
  beforeEach(() => {
    stubs.setFakerSeed(42);
  });

  it("renders toc-sidebar nav element", () => {
    const run = stubs.testRunResult();
    const result = renderToc({ run }, baseDeps);
    expect(result).toContain('<nav class="toc-sidebar"');
    expect(result).toContain('aria-label="Table of contents"');
  });

  it("groups scenarios by source file", () => {
    const tc1 = stubs.testCaseResult({
      id: "tc1",
      sourceFile: "src/auth.test.ts",
      story: stubs.storyMeta({ scenario: "Login works", suitePath: ["Auth"] }),
    });
    const tc2 = stubs.testCaseResult({
      id: "tc2",
      sourceFile: "src/auth.test.ts",
      story: stubs.storyMeta({ scenario: "Logout works", suitePath: ["Auth"] }),
    });
    const tc3 = stubs.testCaseResult({
      id: "tc3",
      sourceFile: "src/cart.test.ts",
      story: stubs.storyMeta({ scenario: "Add to cart", suitePath: ["Cart"] }),
    });
    const run = stubs.testRunResult({ testCases: [tc1, tc2, tc3] });
    const result = renderToc({ run }, baseDeps);

    expect(result).toContain("Auth");
    expect(result).toContain("Cart");
    expect(result).toContain('href="#scenario-tc1"');
    expect(result).toContain('href="#scenario-tc2"');
    expect(result).toContain('href="#scenario-tc3"');
  });

  it("marks failed scenarios with toc-failed class", () => {
    const tc = stubs.testCaseResult({
      id: "fail1",
      status: "failed",
      story: stubs.storyMeta({ scenario: "Broken test" }),
    });
    const run = stubs.testRunResult({ testCases: [tc] });
    const result = renderToc({ run }, baseDeps);
    expect(result).toContain("toc-failed");
  });

  it("returns empty string when no test cases", () => {
    const run = stubs.testRunResult({ testCases: [] });
    const result = renderToc({ run }, baseDeps);
    expect(result).toBe("");
  });
});
