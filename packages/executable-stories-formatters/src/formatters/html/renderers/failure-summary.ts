/**
 * Render failure summary block with deep links to failed scenarios (fn(args, deps)).
 */

import type { TestCaseResult } from "../../../types/test-result";

export interface RenderFailureSummaryArgs {
  failedCases: TestCaseResult[];
}

export interface RenderFailureSummaryDeps {
  escapeHtml: (str: string) => string;
}

export function renderFailureSummary(
  args: RenderFailureSummaryArgs,
  deps: RenderFailureSummaryDeps,
): string {
  const { failedCases } = args;
  if (failedCases.length === 0) return "";

  const items = failedCases
    .map((tc) => {
      const name = deps.escapeHtml(tc.story.scenario);
      return `<li><a href="#scenario-${tc.id}">${name}</a></li>`;
    })
    .join("\n      ");

  return `
<div class="failure-summary">
  <div class="failure-summary-header">Failed (${failedCases.length})</div>
  <div class="failure-summary-note">
    For review-grade output, generate a compare report with <code>compare --pr-summary</code>.
  </div>
  <ul>
      ${items}
  </ul>
</div>`;
}
