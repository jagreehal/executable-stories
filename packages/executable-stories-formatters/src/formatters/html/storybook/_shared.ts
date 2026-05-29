/**
 * Shared dep builders for stories so each story file doesn't repeat the
 * full renderScenario wiring.
 */

import type { DocEntry } from '../../../types/story';
import { renderAttachments } from '../renderers/attachments';
import { renderDocEntry } from '../renderers/doc-entries';
import { renderErrorBox } from '../renderers/error-box';
import type { RenderScenarioDeps } from '../renderers/scenario';
import { getStatusIcon } from '../renderers/status';
import { renderSteps } from '../renderers/steps';
import { renderTraceView } from '../renderers/trace-view';
import { escapeHtml } from '../template';

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
  if (!docs || docs.length === 0) return '';
  const inner = docs.map((d) => renderDocEntry(d, docEntryDeps)).join('');
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
