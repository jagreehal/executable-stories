import { describe, it, expect } from "vitest";
import { renderStep } from "../../../../src/formatters/html/renderers/steps";

const deps = {
  escapeHtml: (s: string) => s,
  getStatusIcon: (status: string) => (status === "passed" ? "✓" : "○"),
  renderDocs: () => "",
};

describe("renderStep data attributes", () => {
  it("includes data-keyword attribute with trimmed keyword", () => {
    const html = renderStep(
      { keyword: "Given", text: "a user exists" },
      { index: 0, status: "passed", durationMs: 10 },
      0,
      deps,
    );
    expect(html).toContain('data-keyword="Given"');
  });

  it("includes data-text attribute with step text", () => {
    const html = renderStep(
      { keyword: "When", text: "the user logs in" },
      { index: 0, status: "passed", durationMs: 10 },
      0,
      deps,
    );
    expect(html).toContain('data-text="the user logs in"');
  });
});
