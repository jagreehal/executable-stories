/**
 * Render a scenario element (fn(args, deps)).
 */

import type { DocEntry, NormalizedTicket } from "../../../types/story";
import type { TestCaseResult } from "../../../types/test-result";
import type { TestMetrics } from "../../../history/types";
import { MIN_METRIC_SAMPLES } from "../../../history/sample-policy";

export interface RenderScenarioArgs {
  tc: TestCaseResult;
  metrics?: TestMetrics;
}

export interface RenderScenarioDeps {
  escapeHtml: (str: string) => string;
  getStatusIcon: (status: import("../../../types/test-result.js").TestStatus) => string;
  startCollapsed: boolean;
  renderSteps: (
    args: import("./steps.js").RenderStepsArgs,
    deps: import("./steps.js").RenderStepsDeps,
  ) => string;
  renderDocs: (docs: DocEntry[] | undefined, containerClass: string) => string;
  renderErrorBox: (
    args: import("./error-box.js").RenderErrorBoxArgs,
    deps: import("./error-box.js").RenderErrorBoxDeps,
  ) => string;
  renderAttachments: (
    args: import("./attachments.js").RenderAttachmentsArgs,
    deps: import("./attachments.js").RenderAttachmentsDeps,
  ) => string;
  renderTraceView: (
    args: import("./trace-view.js").RenderTraceViewArgs,
    deps: import("./trace-view.js").RenderTraceViewDeps,
  ) => string;
  embedScreenshots: boolean;
  permalinkBaseUrl?: string;
  ticketUrlTemplate?: string;
}

function renderTicket(
  ticket: NormalizedTicket,
  template: string | undefined,
  escapeHtml: (s: string) => string,
): string {
  const url = ticket.url ?? (template ? template.replace("{ticket}", ticket.id) : undefined);
  if (url) {
    return `<a class="tag ticket-tag" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ticket.id)}</a>`;
  }
  return `<span class="tag ticket-tag">${escapeHtml(ticket.id)}</span>`;
}

export function renderScenario(
  args: RenderScenarioArgs,
  deps: RenderScenarioDeps,
): string {
  const { tc } = args;
  const statusIcon = deps.getStatusIcon(tc.status);
  const statusClass = `status-${tc.status}`;
  const duration =
    tc.durationMs > 0 ? `${(tc.durationMs / 1000).toFixed(2)}s` : "";

  const tags = tc.tags
    .map((t) => `<span class="tag">${deps.escapeHtml(t)}</span>`)
    .join("");

  const tickets = (tc.story.tickets ?? [])
    .map((t) => renderTicket(t, deps.ticketUrlTemplate, deps.escapeHtml))
    .join("");

  // Trace badge from OTel bridge
  const otelMeta = (tc.story.meta as Record<string, unknown> | undefined)
    ?.otel as { traceId?: string } | undefined;
  let traceBadge = "";
  if (otelMeta?.traceId) {
    const shortId = otelMeta.traceId.slice(0, 16);
    // Look for a "View Trace" link in story-level docs for the URL
    const traceLink = tc.story.docs?.find(
      (d): d is Extract<typeof d, { kind: "link" }> =>
        d.kind === "link" && d.label === "View Trace",
    );
    if (traceLink) {
      traceBadge = `<a class="tag trace-tag" href="${deps.escapeHtml(traceLink.url)}" title="${deps.escapeHtml(otelMeta.traceId)}" target="_blank" rel="noopener">${deps.escapeHtml(shortId)}…</a>`;
    } else {
      traceBadge = `<span class="tag trace-tag" title="${deps.escapeHtml(otelMeta.traceId)}">${deps.escapeHtml(shortId)}…</span>`;
    }
  }

  // History metric badges
  let metricBadges = "";
  const { metrics } = args;
  if (metrics && metrics.sampleSize >= MIN_METRIC_SAMPLES) {
    const grade = metrics.stabilityGrade;
    metricBadges += `<span class="badge badge-grade badge-grade-${grade}" title="Pass rate: ${(metrics.passRate * 100).toFixed(0)}% (${metrics.sampleSize} runs)">${grade}</span>`;

    if (metrics.flakinessLevel !== "stable") {
      metricBadges += `<span class="badge badge-flaky">${metrics.flakinessLevel}</span>`;
    }

    if (metrics.performanceTrend !== "stable") {
      const arrow = metrics.performanceTrend === "improving" ? "\u2191" : "\u2193";
      metricBadges += `<span class="badge badge-perf badge-perf-${metrics.performanceTrend}">${arrow} ${metrics.performanceTrend}</span>`;
    }
  }

  const storyDocs = deps.renderDocs(tc.story.docs, "story-docs");
  const steps = deps.renderSteps(
    { steps: tc.story.steps, stepResults: tc.stepResults },
    {
      escapeHtml: deps.escapeHtml,
      getStatusIcon: deps.getStatusIcon,
      renderDocs: deps.renderDocs,
    },
  );
  const error =
    tc.status === "failed" && tc.errorMessage
      ? deps.renderErrorBox(
          { message: tc.errorMessage, stack: tc.errorStack },
          { escapeHtml: deps.escapeHtml },
        )
      : "";
  const attachments = deps.renderAttachments(
    { attachments: tc.attachments },
    {
      escapeHtml: deps.escapeHtml,
      embedScreenshots: deps.embedScreenshots,
    },
  );

  const traceView = deps.renderTraceView(
    { spans: tc.story.otelSpans },
    { escapeHtml: deps.escapeHtml },
  );

  // Source permalink
  let sourceLink = "";
  if (deps.permalinkBaseUrl && tc.sourceFile && tc.sourceFile !== "unknown") {
    const fragment = tc.sourceLine > 0 ? `#L${tc.sourceLine}` : "";
    const href = `${deps.permalinkBaseUrl}/${tc.sourceFile}${fragment}`;
    const label = `${tc.sourceFile}${tc.sourceLine > 0 ? `:${tc.sourceLine}` : ""}`;
    sourceLink = `<a class="source-link" href="${deps.escapeHtml(href)}" target="_blank" rel="noopener">${deps.escapeHtml(label)}</a>`;
  }

  const collapsedClass = deps.startCollapsed ? " collapsed" : "";
  const ariaExpanded = !deps.startCollapsed;

  return `
<div class="scenario${collapsedClass}" id="scenario-${tc.id}">
  <div class="scenario-header" role="button" tabindex="0" aria-expanded="${ariaExpanded}">
    <div class="scenario-info">
      <div class="scenario-title">
        <span class="status-icon ${statusClass}">${statusIcon}</span>
        <span class="scenario-name">${deps.escapeHtml(tc.story.scenario)}</span>
      </div>
      <div class="scenario-meta">${tags}${tickets}${sourceLink}${traceBadge}${metricBadges}</div>
    </div>
    <div class="scenario-actions">
      <button class="copy-scenario-btn" onclick="copyScenarioAsMarkdown('scenario-${tc.id}')" aria-label="Copy scenario as markdown" title="Copy as Markdown">&#x2398;</button>
      <button class="permalink-anchor" onclick="copyPermalink('scenario-${tc.id}')" aria-label="Copy link to scenario" title="Copy link">#</button>
      <span class="scenario-duration">${duration}</span>
    </div>
  </div>
  <div class="scenario-content">
    ${storyDocs}
    ${steps}
    ${error}
    ${attachments}
    ${traceView}
  </div>
</div>`;
}
