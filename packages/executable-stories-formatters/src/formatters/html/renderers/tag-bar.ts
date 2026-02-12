/**
 * Render tag filter bar (fn(args, deps)).
 * Displays clickable tag pills for filtering scenarios and a results counter.
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
        `<button type="button" class="tag-pill" data-tag="${deps.escapeHtml(tag)}">${deps.escapeHtml(tag)}</button>`,
    )
    .join("\n      ");

  return `
<div class="tag-bar">
  <div class="tag-bar-header">
    <span class="tag-bar-label">Filter by tag</span>
    <button type="button" class="tag-bar-clear" style="display:none">Clear</button>
  </div>
  <div class="tag-bar-pills">
    ${pills}
  </div>
</div>
<div class="filter-results" style="display:none">
  Showing <span class="visible-count">0</span> of <span class="total-count">${totalScenarios}</span> scenarios
</div>`;
}
