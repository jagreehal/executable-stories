/**
 * HTML Formatter - Layer 3.
 *
 * Transforms canonical TestRunResult into a standalone HTML report.
 * Implemented via createHtmlFormatter (fn(args, deps) pattern).
 */

import type { TestRunResult } from "../../types/test-result";
import { createHtmlFormatter } from "./renderers/index";

/** Options for HTML formatting */
export interface HtmlOptions {
  /** Report title. Default: "Test Results" */
  title?: string;
  /** Include dark mode toggle. Default: true */
  darkMode?: boolean;
  /** Include search/filter functionality. Default: true */
  searchable?: boolean;
  /** Start scenarios collapsed. Default: false */
  startCollapsed?: boolean;
  /** Embed screenshots inline (base64). Default: true */
  embedScreenshots?: boolean;
  /** Enable syntax highlighting for code blocks (via highlight.js CDN). Default: true */
  syntaxHighlighting?: boolean;
  /** Enable live Mermaid diagram rendering (via Mermaid.js CDN). Default: true */
  mermaidEnabled?: boolean;
  /** Enable Markdown parsing for section doc entries (via marked.js CDN). Default: true */
  markdownEnabled?: boolean;
}

/**
 * HTML Formatter.
 *
 * Transforms TestRunResult into a standalone HTML report with:
 * - Dark/light mode toggle
 * - Search/filter functionality
 * - Collapsible features and scenarios
 * - Modern, accessible design
 *
 * Thin wrapper around createHtmlFormatter for backward compatibility.
 */
export class HtmlFormatter {
  private formatFn: (run: TestRunResult) => string;

  constructor(options: HtmlOptions = {}) {
    const wired = createHtmlFormatter(options);
    this.formatFn = wired.format.bind(wired);
  }

  /**
   * Format a test run into standalone HTML.
   *
   * @param run - Canonical test run result
   * @returns HTML string
   */
  format(run: TestRunResult): string {
    return this.formatFn(run);
  }
}

export { createHtmlFormatter } from "./renderers/index";
export type { HtmlFormatterOptions } from "./renderers/index";
export { escapeHtml, generateHtmlTemplate } from "./template";
export { CSS_STYLES } from "./styles";
export {
  renderMetaInfo,
  renderSummary,
  renderErrorBox,
  renderAttachments,
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
  renderSteps,
  renderStep,
  renderScenario,
  renderFeature,
  buildBody,
  getStatusIcon,
} from "./renderers/index";
