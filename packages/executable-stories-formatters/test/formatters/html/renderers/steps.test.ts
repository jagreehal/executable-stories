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

  it("uses highlightStepParams when provided in deps", () => {
    const highlightStepParams = (text: string) =>
      text.replace(/\d+/g, '<span class="step-param">$&</span>');
    const html = renderStep(
      { keyword: "Given", text: "I have 5 items", docs: undefined },
      { index: 0, status: "passed", durationMs: 0 },
      0,
      { ...deps, highlightStepParams },
    );
    expect(html).toContain('<span class="step-param">5</span>');
    expect(html).toContain('<span class="step-text">');
  });

  it("falls back to escapeHtml when highlightStepParams is not provided", () => {
    const html = renderStep(
      { keyword: "Given", text: "I have 5 items", docs: undefined },
      { index: 0, status: "passed", durationMs: 0 },
      0,
      deps,
    );
    expect(html).toContain("I have 5 items");
    expect(html).not.toContain("step-param");
  });
});
