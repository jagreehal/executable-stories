/**
 * Unit tests for renderSteps (fn(args, deps)).
 */

import { describe, it, expect } from "vitest";
import {
  renderSteps,
  renderStep,
} from "../../../../src/formatters/html/renderers/steps";

const deps = {
  escapeHtml: (s: string) => s,
  getStatusIcon: (status: string) => (status === "passed" ? "✓" : "○"),
  renderDocs: () => "",
};

describe("renderSteps", () => {
  it("renders steps container with single step", () => {
    const html = renderSteps(
      {
        steps: [
          { keyword: "Given", text: "a user", docs: undefined },
        ],
        stepResults: [{ index: 0, status: "passed", durationMs: 10 }],
      },
      deps,
    );
    expect(html).toContain('<div class="steps">');
    expect(html).toContain("step");
    expect(html).toContain("Given");
    expect(html).toContain("a user");
  });

  it("renders continuation step with continuation class", () => {
    const html = renderSteps(
      {
        steps: [
          { keyword: "Given", text: "first", docs: undefined },
          { keyword: "And", text: "second", docs: undefined },
        ],
        stepResults: [
          { index: 0, status: "passed", durationMs: 0 },
          { index: 1, status: "passed", durationMs: 0 },
        ],
      },
      deps,
    );
    expect(html).toContain('class="step continuation"');
  });
});

describe("renderStep", () => {
  it("uses getStatusIcon from deps", () => {
    const getStatusIcon = (status: string) => `[${status}]`;
    const html = renderStep(
      { keyword: "When", text: "action", docs: undefined },
      { index: 0, status: "passed", durationMs: 0 },
      0,
      { ...deps, getStatusIcon },
    );
    expect(html).toContain("[passed]");
  });
});
