/**
 * HTML renderers and factory (fn(args, deps) pattern).
 * Exports all render functions and createHtmlFormatter.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { DocEntry } from "../../../types/story";
import type { TestRunResult } from "../../../types/test-result";
import { escapeHtml, generateHtmlTemplate } from "../template";
import { CSS_STYLES } from "../styles";
import type { HtmlTheme } from "../themes/types.js";
import { resolveTheme, getCssOnlyThemes } from "../themes/index.js";
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
import { renderTraceView } from "./trace-view";
import { renderFeature } from "./feature";
import { buildBody } from "./body";
import { renderFailureSummary } from "./failure-summary";
import { renderToc } from "./toc";

/** Options for HTML formatting (subset used by createHtmlFormatter) */
export interface HtmlFormatterOptions {
  title?: string;
  darkMode?: boolean;
  searchable?: boolean;
  startCollapsed?: boolean;
  embedScreenshots?: boolean;
  /** Inline local html doc files as iframe srcdoc (self-contained report). Default: true */
  embedHtmlFiles?: boolean;
  syntaxHighlighting?: boolean;
  mermaidEnabled?: boolean;
  markdownEnabled?: boolean;
  permalinkBaseUrl?: string;
  /** URL template for ticket links. Use {ticket} as placeholder. E.g., "https://jira.example.com/browse/{ticket}" */
  ticketUrlTemplate?: string;
  /** Show table of contents sidebar. Default: true */
  tocEnabled?: boolean;
  /** Theme name or custom theme object. Default: "default" */
  theme?: string | HtmlTheme;
  /** Include theme picker with all CSS-only themes embedded. Default: false */
  themePickerEnabled?: boolean;
}

const SCREENSHOT_MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  bmp: "image/bmp",
};

/**
 * Read a local screenshot file and encode it as a `data:` URI.
 * Returns undefined if the file is missing, unreadable, or has an unknown extension.
 * Self-contained HTML reports rely on this so PR artifact downloads don't 404 on
 * runner-only paths like `/home/runner/work/.../screenshot.png`.
 */
function readScreenshotAsDataUri(filePath: string): string | undefined {
  try {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = SCREENSHOT_MIME_BY_EXT[ext];
    if (!mime) return undefined;
    if (!fs.existsSync(filePath)) return undefined;
    const buf = fs.readFileSync(filePath);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

/** Warn when inlining HTML files larger than this into the report. */
const HTML_INLINE_WARN_BYTES = 1024 * 1024;

/**
 * Read a local HTML file for srcdoc inlining. Returns undefined if the file is
 * missing or unreadable. Self-contained reports rely on this so doc-html
 * iframes survive when the report is shared off-machine.
 */
function readHtmlFileContent(filePath: string): string | undefined {
  try {
    if (!fs.existsSync(filePath)) return undefined;
    const buf = fs.readFileSync(filePath);
    if (buf.byteLength > HTML_INLINE_WARN_BYTES) {
      console.warn(
        `[executable-stories] Inlining large HTML file (${Math.round(buf.byteLength / 1024)} KiB) into the report: ${filePath}. Consider --asset-mode copy.`,
      );
    }
    return buf.toString("utf8");
  } catch {
    return undefined;
  }
}

function normalizeOptions(options: HtmlFormatterOptions = {}) {
  return {
    title: options.title ?? "Test Results",
    darkMode: options.darkMode ?? true,
    searchable: options.searchable ?? true,
    startCollapsed: options.startCollapsed ?? false,
    embedScreenshots: options.embedScreenshots ?? true,
    embedHtmlFiles: options.embedHtmlFiles ?? true,
    syntaxHighlighting: options.syntaxHighlighting ?? true,
    mermaidEnabled: options.mermaidEnabled ?? true,
    markdownEnabled: options.markdownEnabled ?? true,
    permalinkBaseUrl: options.permalinkBaseUrl,
    ticketUrlTemplate: options.ticketUrlTemplate,
    tocEnabled: options.tocEnabled ?? true,
    theme: options.theme ?? "default",
    themePickerEnabled: options.themePickerEnabled ?? false,
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
    embedScreenshots: opts.embedScreenshots,
    readScreenshot: (filePath: string) => readScreenshotAsDataUri(filePath),
    // When html-file inlining is off (e.g. --asset-mode copy), omit the read
    // hook so doc-html iframes keep their src path for the asset bundler.
    ...(opts.embedHtmlFiles
      ? { readHtmlFile: (filePath: string) => readHtmlFileContent(filePath) }
      : {}),
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
    renderTraceView: (
      args: import("./trace-view.js").RenderTraceViewArgs,
      d: import("./trace-view.js").RenderTraceViewDeps,
    ) => renderTraceView(args, d),
    embedScreenshots: opts.embedScreenshots,
    permalinkBaseUrl: opts.permalinkBaseUrl,
    ticketUrlTemplate: opts.ticketUrlTemplate,
  };

  const featureDeps = {
    escapeHtml,
    startCollapsed: opts.startCollapsed,
    renderScenario: (args: import("./scenario.js").RenderScenarioArgs) =>
      renderScenario(args, scenarioDeps),
    scenarioDeps,
  };

  const tagBarDeps = { escapeHtml };

  const tocDeps = {
    escapeHtml,
    getStatusIcon,
  };

  const bodyDeps = {
    renderMetaInfo,
    renderSummary,
    renderTagBar,
    renderFeature,
    renderFailureSummary,
    metaDeps: { escapeHtml },
    summaryDeps: {},
    tagBarDeps,
    featureDeps,
    failureSummaryDeps: { escapeHtml },
  };

  const theme = resolveTheme(opts.theme);

  return {
    format(run: TestRunResult): string {
      const bodyFn = theme.buildBody ?? buildBody;
      const body = bodyFn({ run }, bodyDeps);
      const templateFn = theme.generateTemplate ?? generateHtmlTemplate;

      // Only inject default TOC for themes that don't override body/template layout
      const isStructuralTheme = !!(theme.buildBody || theme.generateTemplate);
      const tocHtml = opts.tocEnabled && !isStructuralTheme ? renderToc({ run }, tocDeps) : undefined;

      let themePickerHtml: string | undefined;
      let additionalThemeCss: Array<{ name: string; label: string; css: string }> | undefined;

      if (opts.themePickerEnabled) {
        const cssOnlyThemes = getCssOnlyThemes();
        const pickerOptions = cssOnlyThemes
          .map(t => `<option value="${t.name}"${t.name === theme.name ? ' selected' : ''}>${t.label}</option>`)
          .join('');
        themePickerHtml = `<select class="theme-picker" aria-label="Select theme">${pickerOptions}</select>`;
        additionalThemeCss = cssOnlyThemes
          .filter(t => t.name !== theme.name)
          .map(t => ({ name: t.name, label: t.label, css: t.css }));
      }

      return templateFn(
        opts.title,
        theme.css,
        body,
        {
          includeSearch: opts.searchable,
          includeDarkMode: opts.darkMode,
          syntaxHighlighting: opts.syntaxHighlighting,
          mermaidEnabled: opts.mermaidEnabled,
          markdownEnabled: opts.markdownEnabled,
          additionalJs: theme.additionalJs,
          additionalImports: theme.additionalImports,
          tocHtml,
          themePickerHtml,
          additionalThemeCss,
          activeThemeName: theme.name,
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
  renderDocHtml,
  renderDocCustom,
} from "./doc-entries";
export { highlightStepParams } from "./step-params";
export { renderSteps, renderStep } from "./steps";
export { renderScenario } from "./scenario";
export { renderTraceView } from "./trace-view";
export { renderFeature } from "./feature";
export { buildBody } from "./body";
export { renderFailureSummary } from "./failure-summary";
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
export type { RenderTraceViewArgs, RenderTraceViewDeps } from "./trace-view";
export type { RenderFeatureArgs, RenderFeatureDeps } from "./feature";
export type { BuildBodyArgs, BuildBodyDeps } from "./body";
export type { RenderFailureSummaryArgs, RenderFailureSummaryDeps } from "./failure-summary";
export { renderToc } from "./toc";
export type { RenderTocArgs, RenderTocDeps } from "./toc";
