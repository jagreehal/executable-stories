/**
 * HTML Report Template.
 *
 * Assembles the report document and inlines the browser-side interactivity
 * scripts (defined in ./template-scripts) into a <script> tag.
 */

import { JS_THEME, JS_CORE, JS_MARKDOWN_FN, JS_HTML_EMBED } from "./template-scripts";

/** Options for HTML template generation */
export interface HtmlTemplateOptions {
  includeSearch?: boolean;
  includeDarkMode?: boolean;
  syntaxHighlighting?: boolean;
  mermaidEnabled?: boolean;
  markdownEnabled?: boolean;
  /** Additional inline JS injected after core JS (used by themes). */
  additionalJs?: string;
  /** Additional ESM import statements for CDN libraries (used by themes). */
  additionalImports?: string[];
  /** Pre-rendered TOC sidebar HTML. Placed as sibling of .container inside .report-layout. */
  tocHtml?: string;
  /** Pre-rendered theme picker HTML (select element). */
  themePickerHtml?: string;
  /** Additional theme CSS blocks to embed (for theme picker). */
  additionalThemeCss?: Array<{ name: string; label: string; css: string }>;
  /** Name of the currently active theme (for data-theme-name attribute). */
  activeThemeName?: string;
}

/** Generate the inline JavaScript for the report (non-CDN parts) */
function generateScript(options: HtmlTemplateOptions): string {
  const initCalls: string[] = [];

  if (options.includeDarkMode) {
    initCalls.push('initTheme();');
  }
  initCalls.push('readUrlState();');
  initCalls.push('initSearch();');
  initCalls.push('initTagFilter();');
  initCalls.push('initStatusFilter();');
  initCalls.push('initKeyboardShortcuts();');
  initCalls.push('initCollapse();');
  initCalls.push('restoreCollapseState();');
  initCalls.push('initDetailLevel();');
  initCalls.push('applyAllFilters();');
  initCalls.push('initHashScroll();');
  initCalls.push('initToc();');
  initCalls.push('initThemePicker();');
  initCalls.push('initHtmlEmbeds();');

  const initScript = `
// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  ${initCalls.join('\n  ')}
});
`;

  let script = options.includeDarkMode ? JS_THEME : '';
  script += JS_CORE;
  script += JS_HTML_EMBED;
  if (options.additionalJs) {
    script += options.additionalJs;
  }
  script += initScript;

  return script;
}

/** Generate ESM module script that imports CDN libraries and initializes them */
function generateEsmScript(options: HtmlTemplateOptions): string {
  const imports: string[] = [];
  const initCalls: string[] = [];

  if (options.syntaxHighlighting) {
    imports.push('import hljs from "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/es/highlight.min.js";');
    initCalls.push('hljs.highlightAll();');
  }

  if (options.mermaidEnabled) {
    imports.push('import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";');
    initCalls.push("mermaid.initialize({ startOnLoad: false, theme: 'neutral' });");
    initCalls.push('await mermaid.run({ querySelector: ".mermaid" });');
  }

  if (options.markdownEnabled) {
    imports.push('import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";');
    initCalls.push('parseMarkdownSections(marked);');
  }

  if (options.additionalImports) {
    imports.push(...options.additionalImports);
  }

  if (imports.length === 0) return '';

  let script = imports.join('\n  ');
  if (options.markdownEnabled) {
    script += '\n' + JS_MARKDOWN_FN;
  }
  script += '\n  ' + initCalls.join('\n  ');

  return `\n  <script type="module">\n  ${script}\n  </script>`;
}

/**
 * Generate the HTML template for the report.
 */
export function generateHtmlTemplate(
  title: string,
  styles: string,
  body: string,
  options: HtmlTemplateOptions = {}
): string {
  const {
    includeSearch = true,
    includeDarkMode = true,
    syntaxHighlighting = true,
    mermaidEnabled = true,
    markdownEnabled = true,
  } = options;

  const script = generateScript(options);

  // Set initial theme to light; initTheme() will update based on system/localStorage
  const themeAttr = includeDarkMode ? ' data-theme="light"' : '';

  // CDN stylesheet resources for optional features
  const cdnStyles: string[] = [];

  if (syntaxHighlighting) {
    cdnStyles.push('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">');
    cdnStyles.push('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" media="(prefers-color-scheme: dark)">');
  }

  const cdnStylesHtml = cdnStyles.length > 0 ? '\n  ' + cdnStyles.join('\n  ') : '';
  const esmScriptHtml = generateEsmScript(options);

  const additionalThemeStyles = (options.additionalThemeCss ?? [])
    .map(t => `<style data-theme-name="${escapeHtml(t.name)}" disabled>${t.css}</style>`)
    .join('\n  ');

  return `<!DOCTYPE html>
<html lang="en"${themeAttr} data-detail-level="full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(title)}</title>${cdnStylesHtml}
  <style${options.additionalThemeCss ? ` data-theme-name="${escapeHtml(options.activeThemeName ?? 'default')}"` : ''}>${styles}</style>
  ${additionalThemeStyles}
</head>
<body>
  <div class="report-layout">
    ${options.tocHtml ?? ''}
    <div class="main-content">
      <div class="container">
        <header class="header">
          <h1>${escapeHtml(title)}</h1>
          <div class="header-actions">
            <button type="button" class="toc-toggle" onclick="toggleToc()" aria-label="Toggle table of contents" title="Toggle contents">&#x2630;</button>
            ${includeSearch ? '<input type="text" class="search-input" placeholder="Search scenarios..." aria-label="Search scenarios">' : ''}
            <button type="button" class="detail-toggle" onclick="toggleDetailLevel()" aria-label="Toggle detail level" title="Toggle documentation detail"></button>
            ${options.themePickerHtml ?? ''}
            ${includeDarkMode ? '<button type="button" class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme"></button>' : ''}
          </div>
        </header>
        ${body}
      </div>
    </div>
  </div>
  <script>${script}</script>${esmScriptHtml}
</body>
</html>`;
}

/**
 * Escape HTML special characters.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
