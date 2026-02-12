/**
 * HTML renderers and factory (fn(args, deps) pattern).
 * Exports all render functions and createHtmlFormatter.
 */

import type { DocEntry } from "../../../types/story";
import type { TestRunResult } from "../../../types/test-result";
import { escapeHtml, generateHtmlTemplate } from "../template";
import { CSS_STYLES } from "../styles";
import { getStatusIcon } from "./status";
import { renderMetaInfo } from "./meta";
import { renderSummary } from "./summary";
import { renderTagBar } from "./tag-bar";
import { renderErrorBox } from "./error-box";
import { renderAttachments } from "./attachments";
import { renderDocEntry } from "./doc-entries";
import { renderSteps } from "./steps";
import { highlightStepParams } from "./step-params";
import { renderScenario } from "./scenario";
import { renderFeature } from "./feature";
import { buildBody } from "./body";

/** Options for HTML formatting (subset used by createHtmlFormatter) */
export interface HtmlFormatterOptions {
  title?: string;
  darkMode?: boolean;
  searchable?: boolean;
  startCollapsed?: boolean;
  embedScreenshots?: boolean;
  syntaxHighlighting?: boolean;
  mermaidEnabled?: boolean;
  markdownEnabled?: boolean;
}

function normalizeOptions(options: HtmlFormatterOptions = {}) {
  return {
    title: options.title ?? "Test Results",
    darkMode: options.darkMode ?? true,
    searchable: options.searchable ?? true,
    startCollapsed: options.startCollapsed ?? false,
    embedScreenshots: options.embedScreenshots ?? true,
    syntaxHighlighting: options.syntaxHighlighting ?? true,
    mermaidEnabled: options.mermaidEnabled ?? true,
    markdownEnabled: options.markdownEnabled ?? true,
  };
}

/**
 * Factory: wire deps once, return { format(run) }.
 */
export function createHtmlFormatter(
  options: HtmlFormatterOptions = {},
): { format(run: TestRunResult): string } {
  const opts = normalizeOptions(options);

  const docEntryDeps = {
    escapeHtml,
    syntaxHighlighting: opts.syntaxHighlighting,
    markdownEnabled: opts.markdownEnabled,
    mermaidEnabled: opts.mermaidEnabled,
  };

  const renderDocs = (
    docs: DocEntry[] | undefined,
    containerClass: string,
  ): string => {
    if (!docs || docs.length === 0) return "";
    const entries = docs.map((entry) => renderDocEntry(entry, docEntryDeps)).join("");
    return `<div class="${containerClass}">${entries}</div>`;
  };

  const stepsDeps = {
    escapeHtml,
    getStatusIcon,
    renderDocs,
    highlightStepParams: (text: string) =>
      highlightStepParams(text, { escapeHtml }),
  };

  const scenarioDeps = {
    escapeHtml,
    getStatusIcon,
    startCollapsed: opts.startCollapsed,
    renderSteps: (args: import("./steps.js").RenderStepsArgs) =>
      renderSteps(args, stepsDeps),
    renderDocs,
    renderErrorBox: (
      args: import("./error-box.js").RenderErrorBoxArgs,
      d: import("./error-box.js").RenderErrorBoxDeps,
    ) => renderErrorBox(args, d),
    renderAttachments: (
      args: import("./attachments.js").RenderAttachmentsArgs,
      d: import("./attachments.js").RenderAttachmentsDeps,
    ) => renderAttachments(args, d),
    embedScreenshots: opts.embedScreenshots,
  };

  const featureDeps = {
    escapeHtml,
    startCollapsed: opts.startCollapsed,
    renderScenario: (args: import("./scenario.js").RenderScenarioArgs) =>
      renderScenario(args, scenarioDeps),
    scenarioDeps,
  };

  const tagBarDeps = { escapeHtml };

  const bodyDeps = {
    renderMetaInfo,
    renderSummary,
    renderTagBar,
    renderFeature,
    metaDeps: { escapeHtml },
    summaryDeps: {},
    tagBarDeps,
    featureDeps,
  };

  return {
    format(run: TestRunResult): string {
      const body = buildBody({ run }, bodyDeps);
      return generateHtmlTemplate(
        opts.title,
        CSS_STYLES,
        body,
        {
          includeSearch: opts.searchable,
          includeDarkMode: opts.darkMode,
          syntaxHighlighting: opts.syntaxHighlighting,
          mermaidEnabled: opts.mermaidEnabled,
          markdownEnabled: opts.markdownEnabled,
        },
      );
    },
  };
}

export { renderMetaInfo } from "./meta";
export { renderSummary } from "./summary";
export { renderTagBar } from "./tag-bar";
export { renderErrorBox } from "./error-box";
export { renderAttachments } from "./attachments";
export {
  renderDocEntry,
  renderDocNote,
  renderDocTag,
  renderDocKv,
  renderDocCode,
  renderDocTable,
  renderDocLink,
  renderDocSection,
  renderDocMermaid,
  renderDocScreenshot,
  renderDocCustom,
} from "./doc-entries";
export { highlightStepParams } from "./step-params";
export { renderSteps, renderStep } from "./steps";
export { renderScenario } from "./scenario";
export { renderFeature } from "./feature";
export { buildBody } from "./body";
export { getStatusIcon } from "./status";
export type { DocEntryDeps } from "./doc-entries";
export type { RenderMetaInfoArgs, RenderMetaInfoDeps } from "./meta";
export type { RenderSummaryArgs, RenderSummaryDeps } from "./summary";
export type { RenderTagBarArgs, RenderTagBarDeps } from "./tag-bar";
export type { RenderErrorBoxArgs, RenderErrorBoxDeps } from "./error-box";
export type { RenderAttachmentsArgs, RenderAttachmentsDeps } from "./attachments";
export type { HighlightStepParamsDeps } from "./step-params";
export type { RenderStepsArgs, RenderStepsDeps } from "./steps";
export type { RenderScenarioArgs, RenderScenarioDeps } from "./scenario";
export type { RenderFeatureArgs, RenderFeatureDeps } from "./feature";
export type { BuildBodyArgs, BuildBodyDeps } from "./body";
