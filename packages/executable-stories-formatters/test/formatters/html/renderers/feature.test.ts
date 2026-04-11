import { describe, it, expect, beforeEach } from "vitest";
import { renderFeature } from "../../../../src/formatters/html/renderers/feature";
import { escapeHtml } from "../../../../src/formatters/html/template";
import { stubs } from "../../../stubs";

const baseDeps = {
  escapeHtml,
  startCollapsed: false,
  renderScenario: () => '<div class="scenario">mock</div>',
  scenarioDeps: {} as any,
};

describe("renderFeature", () => {
  beforeEach(() => {
    stubs.setFakerSeed(42);
  });

  it("renders feature with id from slugified file path", () => {
    const tc = stubs.testCaseResult({
      story: stubs.storyMeta({ scenario: "Test", tags: [] }),
      tags: [],
    });
    const result = renderFeature(
      { file: "src/calculator.story.test.ts", testCases: [tc] },
      baseDeps,
    );
    expect(result).toContain('id="feature-src-calculatorstorytestts"');
  });

  it("renders permalink anchor icon in feature header", () => {
    const tc = stubs.testCaseResult({
      story: stubs.storyMeta({ scenario: "Test", tags: [] }),
      tags: [],
    });
    const result = renderFeature(
      { file: "src/calc.test.ts", testCases: [tc] },
      baseDeps,
    );
    expect(result).toContain('class="permalink-anchor"');
    expect(result).toContain("copyPermalink");
  });
});
