/**
 * Render tag filter bar (fn(args, deps)).
 * Displays a collapsible tag bar with clickable tag pills for filtering scenarios,
 * ARIA attributes for accessibility, and a results counter.
 */

export interface RenderTagBarArgs {
  tags: string[];
  totalScenarios: number;
}

export interface RenderTagBarDeps {
  escapeHtml: (str: string) => string;
}

export function renderTagBar(
  args: RenderTagBarArgs,
  deps: RenderTagBarDeps,
): string {
  const { tags, totalScenarios } = args;

  if (tags.length === 0) return "";

  const pills = tags
    .map(
      (tag) =>
        `<button type="button" class="tag-pill" data-tag="${deps.escapeHtml(tag)}" aria-pressed="false">${deps.escapeHtml(tag)}</button>`,
    )
    .join("\n        ");

  return `
<div class="tag-bar tag-bar-collapsed">
  <div class="tag-bar-header">
    <button type="button" class="tag-bar-toggle" aria-expanded="false" aria-controls="tag-pills-region">
      <span class="tag-bar-label">Filter by tag</span>
      <span class="tag-bar-count" aria-live="polite"></span>
      <svg class="tag-bar-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <button type="button" class="tag-bar-clear" aria-label="Clear all tag filters" style="display:none">Clear all</button>
  </div>
  <div id="tag-pills-region" class="tag-bar-pills" role="group" aria-label="Tag filters">
    ${pills}
  </div>
</div>
<div class="filter-results" style="display:none" aria-live="polite">
  Showing <span class="visible-count">0</span> of <span class="total-count">${totalScenarios}</span> scenarios
</div>`;
}
