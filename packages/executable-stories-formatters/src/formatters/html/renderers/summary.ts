/**
 * Render summary cards section (fn(args, deps)).
 * No deps: pure counts to HTML.
 */

export interface RenderSummaryArgs {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface RenderSummaryDeps {
  // No dependencies; structure only
}

export function renderSummary(
  args: RenderSummaryArgs,
  _deps: RenderSummaryDeps,
): string {
  const { total, passed, failed, skipped } = args;
  return `
<div class="summary">
  <div class="summary-card">
    <div class="label">Total</div>
    <div class="value">${total}</div>
  </div>
  <div class="summary-card passed">
    <div class="label">Passed</div>
    <div class="value">${passed}</div>
  </div>
  <div class="summary-card failed">
    <div class="label">Failed</div>
    <div class="value">${failed}</div>
  </div>
  <div class="summary-card skipped">
    <div class="label">Skipped</div>
    <div class="value">${skipped}</div>
  </div>
</div>`;
}
