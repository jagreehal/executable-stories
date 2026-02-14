/**
 * HTML Report Template.
 *
 * Generates the JavaScript for interactivity (theme toggle, search, collapse).
 */

/** Theme-related JavaScript (only included when darkMode is enabled) */
const JS_THEME = `
// Theme management
function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getEffectiveTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return getSystemTheme();
}

function toggleTheme() {
  const current = getEffectiveTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
  const btn = document.querySelector('.theme-toggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '\\u2600\\ufe0f' : '\\ud83c\\udf19';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

function initTheme() {
  const theme = getEffectiveTheme();
  applyTheme(theme);

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}
`;

/** Core JavaScript (always included) */
const JS_CORE = `
// Filter state
var activeTags = new Set();
var activeStatus = null;

// Search functionality
function initSearch() {
  var input = document.querySelector('.search-input');
  if (!input) return;

  var debounceTimer;
  input.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      applyAllFilters();
    }, 150);
  });

  // Clear search on Escape
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      e.target.value = '';
      applyAllFilters();
    }
  });
}

// Tag filter
function initTagFilter() {
  document.querySelectorAll('.tag-pill').forEach(function(pill) {
    pill.addEventListener('click', function() {
      var tag = pill.dataset.tag;
      if (activeTags.has(tag)) {
        activeTags.delete(tag);
        pill.classList.remove('active');
      } else {
        activeTags.add(tag);
        pill.classList.add('active');
      }
      updateClearButton();
      applyAllFilters();
    });
  });

  var clearBtn = document.querySelector('.tag-bar-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      activeTags.clear();
      document.querySelectorAll('.tag-pill.active').forEach(function(p) { p.classList.remove('active'); });
      updateClearButton();
      applyAllFilters();
    });
  }
}

function updateClearButton() {
  var clearBtn = document.querySelector('.tag-bar-clear');
  if (clearBtn) {
    clearBtn.style.display = activeTags.size > 0 ? '' : 'none';
  }
}

// Status filter (clickable summary cards)
function initStatusFilter() {
  document.querySelectorAll('.summary-card').forEach(function(card) {
    card.style.cursor = 'pointer';
    if (!card.classList.contains('passed') && !card.classList.contains('failed') && !card.classList.contains('skipped')) {
      card.addEventListener('click', function() {
        activeStatus = null;
        document.querySelectorAll('.summary-card').forEach(function(c) { c.classList.remove('status-active'); });
        applyAllFilters();
      });
      return;
    }
    card.addEventListener('click', function() {
      var status = card.classList.contains('passed') ? 'passed' :
                   card.classList.contains('failed') ? 'failed' : 'skipped';
      if (activeStatus === status) {
        activeStatus = null;
        card.classList.remove('status-active');
      } else {
        activeStatus = status;
        document.querySelectorAll('.summary-card').forEach(function(c) { c.classList.remove('status-active'); });
        card.classList.add('status-active');
      }
      applyAllFilters();
    });
  });
}

// Unified filter: composes search + tags + status
function applyAllFilters() {
  var searchInput = document.querySelector('.search-input');
  var searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
  var features = document.querySelectorAll('.feature');
  var visibleCount = 0;
  var totalCount = 0;

  features.forEach(function(feature) {
    var scenarios = feature.querySelectorAll('.scenario');
    var featureVisible = 0;

    scenarios.forEach(function(scenario) {
      totalCount++;
      var title = (scenario.querySelector('.scenario-title') || {}).textContent || '';
      title = title.toLowerCase();
      var tags = Array.from(scenario.querySelectorAll('.scenario-meta .tag')).map(function(t) { return t.textContent.toLowerCase(); });
      var steps = Array.from(scenario.querySelectorAll('.step-text')).map(function(s) { return s.textContent.toLowerCase(); });
      var statusEl = scenario.querySelector('.status-icon');
      var status = statusEl && statusEl.classList.contains('status-passed') ? 'passed' :
                   statusEl && statusEl.classList.contains('status-failed') ? 'failed' :
                   statusEl && statusEl.classList.contains('status-skipped') ? 'skipped' : 'pending';

      var matchesSearch = !searchQuery ||
        title.includes(searchQuery) ||
        tags.some(function(t) { return t.includes(searchQuery); }) ||
        steps.some(function(s) { return s.includes(searchQuery); });

      var matchesTags = activeTags.size === 0 ||
        tags.some(function(t) { return activeTags.has(t); });

      var matchesStatus = !activeStatus ||
        status === activeStatus ||
        (activeStatus === 'skipped' && status === 'pending');

      var visible = matchesSearch && matchesTags && matchesStatus;
      scenario.style.display = visible ? '' : 'none';
      if (visible) { visibleCount++; featureVisible++; }
    });

    feature.style.display = featureVisible > 0 ? '' : 'none';
  });

  updateFilterResults(visibleCount, totalCount);
}

function updateFilterResults(visible, total) {
  var el = document.querySelector('.filter-results');
  if (!el) return;
  var searchInput = document.querySelector('.search-input');
  var isFiltering = activeTags.size > 0 || activeStatus ||
    (searchInput && searchInput.value.trim().length > 0);
  el.style.display = isFiltering ? '' : 'none';
  var vc = el.querySelector('.visible-count');
  var tc = el.querySelector('.total-count');
  if (vc) vc.textContent = visible;
  if (tc) tc.textContent = total;
}

// Keyboard shortcuts
function initKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      var input = document.querySelector('.search-input');
      if (input) input.focus();
    }
  });
}

// Collapse/expand functionality
function toggleCollapse(header, container) {
  container?.classList.toggle('collapsed');
  const isCollapsed = container?.classList.contains('collapsed');
  header.setAttribute('aria-expanded', !isCollapsed);
}

function initCollapse() {
  document.querySelectorAll('.feature-header').forEach(header => {
    header.addEventListener('click', () => {
      toggleCollapse(header, header.closest('.feature'));
    });
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCollapse(header, header.closest('.feature'));
      }
    });
  });

  document.querySelectorAll('.scenario-header').forEach(header => {
    header.addEventListener('click', () => {
      toggleCollapse(header, header.closest('.scenario'));
    });
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCollapse(header, header.closest('.scenario'));
      }
    });
  });

  document.querySelectorAll('.trace-view-header').forEach(header => {
    header.addEventListener('click', () => {
      toggleCollapse(header, header.closest('.trace-view'));
    });
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCollapse(header, header.closest('.trace-view'));
      }
    });
  });
}

function expandAll() {
  document.querySelectorAll('.feature, .scenario').forEach(el => {
    el.classList.remove('collapsed');
    const header = el.querySelector('.feature-header, .scenario-header');
    header?.setAttribute('aria-expanded', 'true');
  });
}

function collapseAll() {
  document.querySelectorAll('.feature, .scenario').forEach(el => {
    el.classList.add('collapsed');
    const header = el.querySelector('.feature-header, .scenario-header');
    header?.setAttribute('aria-expanded', 'false');
  });
}
`;

/** Options for HTML template generation */
export interface HtmlTemplateOptions {
  includeSearch?: boolean;
  includeDarkMode?: boolean;
  syntaxHighlighting?: boolean;
  mermaidEnabled?: boolean;
  markdownEnabled?: boolean;
}

/** JavaScript for markdown parsing (used as a function body string in the ESM module) */
const JS_MARKDOWN_FN = `
function parseMarkdownSections(marked) {
  // Configure marked for safe output
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  document.querySelectorAll('.doc-section-content[data-markdown]').forEach(el => {
    const encoded = el.getAttribute('data-markdown');
    if (!encoded) return;

    try {
      const markdown = decodeURIComponent(atob(encoded));
      // Use marked.parse and sanitize by escaping script tags
      let html = marked.parse(markdown);
      // Basic XSS prevention - remove script tags
      html = html.replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '');
      el.innerHTML = html;
      el.removeAttribute('data-markdown');
    } catch (e) {
      console.warn('Failed to parse markdown:', e);
    }
  });
}
`;

/** Generate the inline JavaScript for the report (non-CDN parts) */
function generateScript(options: HtmlTemplateOptions): string {
  const initCalls: string[] = [];

  if (options.includeDarkMode) {
    initCalls.push('initTheme();');
  }
  initCalls.push('initSearch();');
  initCalls.push('initTagFilter();');
  initCalls.push('initStatusFilter();');
  initCalls.push('initKeyboardShortcuts();');
  initCalls.push('initCollapse();');

  const initScript = `
// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  ${initCalls.join('\n  ')}
});
`;

  let script = options.includeDarkMode ? JS_THEME : '';
  script += JS_CORE;
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

  return `<!DOCTYPE html>
<html lang="en"${themeAttr}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(title)}</title>${cdnStylesHtml}
  <style>${styles}</style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>${escapeHtml(title)}</h1>
      <div class="header-actions">
        ${includeSearch ? '<input type="text" class="search-input" placeholder="Search scenarios..." aria-label="Search scenarios">' : ''}
        ${includeDarkMode ? '<button type="button" class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme"></button>' : ''}
      </div>
    </header>
    ${body}
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
