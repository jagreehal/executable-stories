/**
 * Shared dep builders for stories so each story file doesn't repeat the
 * full renderScenario wiring.
 */

import { renderSteps } from "../src/formatters/html/renderers/steps";
import { renderErrorBox } from "../src/formatters/html/renderers/error-box";
import { renderAttachments } from "../src/formatters/html/renderers/attachments";
import { renderTraceView } from "../src/formatters/html/renderers/trace-view";
import { renderDocEntry } from "../src/formatters/html/renderers/doc-entries";
import { getStatusIcon } from "../src/formatters/html/renderers/status";
import { escapeHtml } from "../src/formatters/html/template";
import type { DocEntry } from "../src/types/story";
import type { RenderScenarioDeps } from "../src/formatters/html/renderers/scenario";

const docEntryDeps = {
  escapeHtml,
  syntaxHighlighting: true,
  markdownEnabled: false,
  mermaidEnabled: false,
};

export const renderDocs = (
  docs: DocEntry[] | undefined,
  containerClass: string,
): string => {
  if (!docs || docs.length === 0) return "";
  const inner = docs.map((d) => renderDocEntry(d, docEntryDeps)).join("");
  return `<div class="${containerClass}">${inner}</div>`;
};

export const scenarioDeps: RenderScenarioDeps = {
  escapeHtml,
  getStatusIcon,
  startCollapsed: false,
  renderSteps,
  renderDocs,
  renderErrorBox,
  renderAttachments,
  renderTraceView,
  embedScreenshots: false,
};
