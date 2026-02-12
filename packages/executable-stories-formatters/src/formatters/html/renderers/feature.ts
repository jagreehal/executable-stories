/**
 * Render a feature section (group of scenarios from same file) (fn(args, deps)).
 */

import type { TestCaseResult } from "../../../types/test-result";

export interface RenderFeatureArgs {
  file: string;
  testCases: TestCaseResult[];
}

export interface RenderFeatureDeps {
  escapeHtml: (str: string) => string;
  startCollapsed: boolean;
  renderScenario: (
    args: import("./scenario.js").RenderScenarioArgs,
    deps: import("./scenario.js").RenderScenarioDeps,
  ) => string;
  scenarioDeps: import("./scenario.js").RenderScenarioDeps;
}

export function renderFeature(
  args: RenderFeatureArgs,
  deps: RenderFeatureDeps,
): string {
  const { file, testCases } = args;
  const passed = testCases.filter((tc) => tc.status === "passed").length;
  const failed = testCases.filter((tc) => tc.status === "failed").length;
  const skipped = testCases.filter(
    (tc) => tc.status === "skipped" || tc.status === "pending",
  ).length;

  const suitePaths = testCases
    .map((tc) => tc.titlePath)
    .filter((p) => p.length > 0);
  const featureName =
    suitePaths.length > 0 && suitePaths[0].length > 0
      ? suitePaths[0][0]
      : file.split("/").pop()?.replace(/\.[^.]+$/, "") ?? file;

  const collapsedClass = deps.startCollapsed ? " collapsed" : "";
  const ariaExpanded = !deps.startCollapsed;

  const scenarios = testCases
    .map((tc) => deps.renderScenario({ tc }, deps.scenarioDeps))
    .join("\n");

  return `
<div class="feature${collapsedClass}">
  <div class="feature-header" role="button" tabindex="0" aria-expanded="${ariaExpanded}">
    <div class="feature-info">
      <div class="feature-title">${deps.escapeHtml(featureName)}</div>
      <div class="feature-path">${deps.escapeHtml(file)}</div>
    </div>
    <div class="feature-stats">
      <span class="stat passed">✓ ${passed}</span>
      <span class="stat failed">✗ ${failed}</span>
      <span class="stat skipped">○ ${skipped}</span>
      <span class="chevron">▼</span>
    </div>
  </div>
  <div class="feature-content">
    ${scenarios}
  </div>
</div>`;
}
