/**
 * Render steps list (fn(args, deps)).
 */

import type { DocEntry, StoryStep } from "../../../types/story";
import type { StepResult } from "../../../types/test-result";

const CONTINUATION_KEYWORDS = ["And", "But", "*"];

export interface RenderStepsArgs {
  steps: StoryStep[];
  stepResults: StepResult[];
}

export interface RenderStepsDeps {
  escapeHtml: (str: string) => string;
  getStatusIcon: (status: import("../../../types/test-result.js").TestStatus) => string;
  renderDocs: (docs: DocEntry[] | undefined, containerClass: string) => string;
  highlightStepParams?: (text: string) => string;
}

export function renderStep(
  step: StoryStep,
  stepResult: StepResult | undefined,
  index: number,
  deps: RenderStepsDeps,
): string {
  const statusIcon = stepResult ? deps.getStatusIcon(stepResult.status) : "○";
  const statusClass = stepResult ? `status-${stepResult.status}` : "";
  const duration =
    stepResult && stepResult.durationMs > 0
      ? `${stepResult.durationMs}ms`
      : "";

  const keywordTrimmed = step.keyword.trim();
  const isContinuation = CONTINUATION_KEYWORDS.includes(keywordTrimmed);
  const stepClass = isContinuation ? "step continuation" : "step";

  const stepDocs = deps.renderDocs(step.docs, "step-docs");

  const textHtml = deps.highlightStepParams
    ? deps.highlightStepParams(step.text)
    : deps.escapeHtml(step.text);

  return `<div class="${stepClass}" data-keyword="${deps.escapeHtml(keywordTrimmed)}" data-text="${deps.escapeHtml(step.text)}">
  <span class="step-status ${statusClass}">${statusIcon}</span>
  <span class="step-keyword">${deps.escapeHtml(step.keyword)}</span>
  <span class="step-text">${textHtml}</span>
  <span class="step-duration">${duration}</span>
</div>${stepDocs}`;
}

export function renderSteps(
  args: RenderStepsArgs,
  deps: RenderStepsDeps,
): string {
  const byStepId = new Map(
    args.stepResults
      .filter((sr) => typeof sr.stepId === "string" && sr.stepId.length > 0)
      .map((sr) => [sr.stepId as string, sr]),
  );
  const stepsHtml = args.steps
    .map((step, index) => {
      const stepResult =
        (step.id ? byStepId.get(step.id) : undefined) ??
        args.stepResults.find((sr) => sr.index === index);
      return renderStep(step, stepResult, index, deps);
    })
    .join("");
  return `<div class="steps">${stepsHtml}</div>`;
}
