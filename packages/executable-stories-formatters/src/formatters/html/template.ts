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
var activeDetailLevel = 'full';

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
  var toggleBtn = document.querySelector('.tag-bar-toggle');
  var tagBar = document.querySelector('.tag-bar');
  if (toggleBtn && tagBar) {
    toggleBtn.addEventListener('click', function() {
      var isCollapsed = tagBar.classList.toggle('tag-bar-collapsed');
      toggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
    });
  }

  document.querySelectorAll('.tag-pill').forEach(function(pill) {
    pill.addEventListener('click', function() {
      var tag = pill.dataset.tag;
      if (activeTags.has(tag)) {
        activeTags.delete(tag);
        pill.classList.remove('active');
        pill.setAttribute('aria-pressed', 'false');
      } else {
        activeTags.add(tag);
        pill.classList.add('active');
        pill.setAttribute('aria-pressed', 'true');
      }
      updateTagBarState();
      applyAllFilters();
    });
  });

  var clearBtn = document.querySelector('.tag-bar-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      activeTags.clear();
      document.querySelectorAll('.tag-pill.active').forEach(function(p) {
        p.classList.remove('active');
        p.setAttribute('aria-pressed', 'false');
      });
      updateTagBarState();
      applyAllFilters();
    });
  }
}

function updateTagBarState() {
  var clearBtn = document.querySelector('.tag-bar-clear');
  var countBadge = document.querySelector('.tag-bar-count');
  if (clearBtn) {
    clearBtn.style.display = activeTags.size > 0 ? '' : 'none';
  }
  if (countBadge) {
    countBadge.textContent = activeTags.size > 0 ? activeTags.size + ' selected' : '';
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
  syncTocVisibility();
  writeUrlState();
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

// Keyboard navigation
var focusedScenarioIndex = -1;

function getVisibleScenarios() {
  return Array.from(document.querySelectorAll('.scenario')).filter(function(s) {
    return s.style.display !== 'none' && s.closest('.feature').style.display !== 'none';
  });
}

function focusScenario(index) {
  var scenarios = getVisibleScenarios();
  if (scenarios.length === 0) return;

  // Remove previous focus
  var prev = document.querySelector('.scenario-focused');
  if (prev) prev.classList.remove('scenario-focused');

  // Wrap around
  if (index < 0) index = scenarios.length - 1;
  if (index >= scenarios.length) index = 0;
  focusedScenarioIndex = index;

  var scenario = scenarios[index];
  scenario.classList.add('scenario-focused');
  scenario.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function showShortcutsOverlay() {
  if (document.querySelector('.shortcuts-overlay')) return;
  var overlay = document.createElement('div');
  overlay.className = 'shortcuts-overlay';
  overlay.innerHTML = '<div class="shortcuts-modal">' +
    '<div class="shortcuts-title">Keyboard Shortcuts</div>' +
    '<div class="shortcuts-grid">' +
    '<kbd>j</kbd><span>Next scenario</span>' +
    '<kbd>k</kbd><span>Previous scenario</span>' +
    '<kbd>Enter</kbd><span>Expand/collapse scenario</span>' +
    '<kbd>Escape</kbd><span>Collapse scenario / close</span>' +
    '<kbd>/</kbd><span>Focus search</span>' +
    '<kbd>?</kbd><span>Toggle this help</span>' +
    '<kbd>e</kbd><span>Expand all</span>' +
    '<kbd>c</kbd><span>Collapse all</span>' +
    '<kbd>t</kbd><span>Toggle table of contents</span>' +
    '</div></div>';
  overlay.addEventListener('click', function(ev) {
    if (ev.target === overlay) hideShortcutsOverlay();
  });
  document.body.appendChild(overlay);
}

function hideShortcutsOverlay() {
  var overlay = document.querySelector('.shortcuts-overlay');
  if (overlay) overlay.remove();
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    var tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
      if (e.key === 'Escape') {
        e.target.blur();
        if (e.target.classList.contains('search-input')) {
          e.target.value = '';
          applyAllFilters();
        }
      }
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key) {
      case 'j':
        e.preventDefault();
        focusScenario(focusedScenarioIndex + 1);
        break;
      case 'k':
        e.preventDefault();
        focusScenario(focusedScenarioIndex - 1);
        break;
      case 'Enter':
        e.preventDefault();
        var scenarios = getVisibleScenarios();
        if (focusedScenarioIndex >= 0 && focusedScenarioIndex < scenarios.length) {
          var s = scenarios[focusedScenarioIndex];
          var h = s.querySelector('.scenario-header');
          if (h) toggleCollapse(h, s);
        }
        break;
      case 'Escape':
        if (document.querySelector('.shortcuts-overlay')) {
          hideShortcutsOverlay();
        } else {
          var scenarios2 = getVisibleScenarios();
          if (focusedScenarioIndex >= 0 && focusedScenarioIndex < scenarios2.length) {
            var sc = scenarios2[focusedScenarioIndex];
            if (!sc.classList.contains('collapsed')) {
              sc.classList.add('collapsed');
              var sh = sc.querySelector('.scenario-header');
              if (sh) sh.setAttribute('aria-expanded', 'false');
            }
          }
        }
        break;
      case '/':
        e.preventDefault();
        var input = document.querySelector('.search-input');
        if (input) input.focus();
        break;
      case '?':
        e.preventDefault();
        if (document.querySelector('.shortcuts-overlay')) {
          hideShortcutsOverlay();
        } else {
          showShortcutsOverlay();
        }
        break;
      case 'e':
        e.preventDefault();
        expandAll();
        break;
      case 'c':
        e.preventDefault();
        collapseAll();
        break;
      case 't':
        e.preventDefault();
        if (typeof toggleToc === 'function') toggleToc();
        break;
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
  document.querySelectorAll('.feature, .scenario, .trace-view').forEach(el => {
    el.classList.remove('collapsed');
    const header = el.querySelector('.feature-header, .scenario-header, .trace-view-header');
    header?.setAttribute('aria-expanded', 'true');
  });
}

function collapseAll() {
  document.querySelectorAll('.feature, .scenario, .trace-view').forEach(el => {
    el.classList.add('collapsed');
    const header = el.querySelector('.feature-header, .scenario-header, .trace-view-header');
    header?.setAttribute('aria-expanded', 'false');
  });
}

// Detail level toggle
function toggleDetailLevel() {
  activeDetailLevel = activeDetailLevel === 'full' ? 'minimal' : 'full';
  document.documentElement.setAttribute('data-detail-level', activeDetailLevel);
  updateDetailToggle();
  writeUrlState();
}

function updateDetailToggle() {
  var btn = document.querySelector('.detail-toggle');
  if (btn) {
    btn.textContent = activeDetailLevel === 'full' ? '\\ud83d\\udccb' : '\\ud83d\\udcc4';
    btn.setAttribute('aria-label', activeDetailLevel === 'full' ? 'Hide documentation (minimal)' : 'Show documentation (full)');
    btn.title = activeDetailLevel === 'full' ? 'Showing full detail' : 'Showing minimal detail';
  }
}

function initDetailLevel() {
  updateDetailToggle();
}

// URL state sync for shareable URLs
function readUrlState() {
  var params = new URLSearchParams(window.location.search);

  var search = params.get('search');
  if (search) {
    var input = document.querySelector('.search-input');
    if (input) input.value = search;
  }

  var tags = params.get('tags');
  if (tags) {
    tags.split(',').forEach(function(tag) {
      var pill = document.querySelector('.tag-pill[data-tag="' + tag + '"]');
      if (pill) {
        activeTags.add(tag);
        pill.classList.add('active');
        pill.setAttribute('aria-pressed', 'true');
      }
    });
    updateTagBarState();
  }

  var status = params.get('status');
  if (status && ['passed', 'failed', 'skipped'].indexOf(status) !== -1) {
    activeStatus = status;
    var card = document.querySelector('.summary-card.' + status);
    if (card) card.classList.add('status-active');
  }

  var detail = params.get('detail');
  if (detail === 'minimal' || detail === 'full') {
    activeDetailLevel = detail;
    document.documentElement.setAttribute('data-detail-level', detail);
    updateDetailToggle();
  }
}

function writeUrlState() {
  var params = new URLSearchParams();
  var input = document.querySelector('.search-input');
  var search = input ? input.value.trim() : '';
  if (search) params.set('search', search);
  if (activeTags.size > 0) params.set('tags', Array.from(activeTags).sort().join(','));
  if (activeStatus) params.set('status', activeStatus);
  if (activeDetailLevel !== 'full') params.set('detail', activeDetailLevel);

  var qs = params.toString();
  var url = window.location.pathname + (qs ? '?' + qs : '');
  history.replaceState(null, '', url);
}

// Permalink copy
function copyPermalink(anchorId) {
  var url = location.origin + location.pathname + location.search + '#' + anchorId;
  navigator.clipboard.writeText(url).then(function() {
    var el = document.getElementById(anchorId);
    if (el) showCopyToast(el);
  });
}

function showCopyToast(el) {
  var existing = el.querySelector('.copy-toast');
  if (existing) existing.remove();
  var toast = document.createElement('span');
  toast.className = 'copy-toast';
  toast.textContent = 'Copied!';
  var header = el.querySelector('.feature-header, .scenario-header');
  if (header) {
    header.style.position = 'relative';
    header.appendChild(toast);
  }
  setTimeout(function() { toast.remove(); }, 1500);
}

// Copy scenario as markdown
function copyScenarioAsMarkdown(scenarioId) {
  var scenario = document.getElementById(scenarioId);
  if (!scenario) return;

  var title = (scenario.querySelector('.scenario-name') || {}).textContent || '';
  var steps = scenario.querySelectorAll('.step, .step.continuation');
  var lines = ['### Scenario: ' + title.trim(), ''];

  steps.forEach(function(step) {
    var keyword = step.getAttribute('data-keyword') || '';
    var text = step.getAttribute('data-text') || '';
    lines.push('- **' + keyword + '** ' + text);
  });

  var errorBox = scenario.querySelector('.error-message');
  if (errorBox) {
    var errorText = errorBox.textContent || '';
    lines.push('');
    lines.push('> **Error:** ' + errorText.trim());
  }

  var md = lines.join('\\n');
  navigator.clipboard.writeText(md).then(function() {
    showCopyToast(scenario);
  });
}

// Hash scroll on load
function initHashScroll() {
  if (!location.hash) return;
  var target = document.querySelector(location.hash);
  if (!target) return;
  var feature = target.closest('.feature');
  if (feature && feature.classList.contains('collapsed')) {
    feature.classList.remove('collapsed');
    var fh = feature.querySelector('.feature-header');
    if (fh) fh.setAttribute('aria-expanded', 'true');
  }
  if (target.classList.contains('collapsed')) {
    target.classList.remove('collapsed');
    var sh = target.querySelector('.scenario-header');
    if (sh) sh.setAttribute('aria-expanded', 'true');
  }
  setTimeout(function() {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('hash-highlight');
  }, 100);
}

// Table of contents
function toggleToc() {
  var sidebar = document.querySelector('.toc-sidebar');
  var wrapper = document.querySelector('.report-layout');
  if (!sidebar || !wrapper) return;
  var isMobile = window.matchMedia('(max-width: 767px)').matches;
  if (isMobile) {
    sidebar.classList.toggle('toc-mobile-open');
  } else {
    wrapper.classList.toggle('toc-hidden');
    var hidden = wrapper.classList.contains('toc-hidden');
    localStorage.setItem('toc-visible', String(!hidden));
  }
}

function initToc() {
  var sidebar = document.querySelector('.toc-sidebar');
  if (!sidebar) return;

  var saved = localStorage.getItem('toc-visible');
  var wrapper = document.querySelector('.report-layout');
  if (saved === 'false' && wrapper) {
    wrapper.classList.add('toc-hidden');
  }

  // Active tracking via IntersectionObserver
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        if (!id) return;
        document.querySelectorAll('.toc-scenario, .toc-feature-toggle').forEach(function(el) {
          el.classList.remove('toc-active');
        });
        var tocLink = sidebar.querySelector('a[href="#' + id + '"]');
        if (tocLink) tocLink.classList.add('toc-active');
      }
    });
  }, { rootMargin: '-10% 0px -80% 0px' });

  document.querySelectorAll('.feature, .scenario').forEach(function(el) {
    if (el.id) observer.observe(el);
  });

  // Click navigation: expand collapsed parents
  sidebar.querySelectorAll('.toc-scenario').forEach(function(link) {
    link.addEventListener('click', function(e) {
      var hash = link.getAttribute('href');
      if (!hash) return;
      var target = document.querySelector(hash);
      if (!target) return;
      var feature = target.closest('.feature');
      if (feature && feature.classList.contains('collapsed')) {
        feature.classList.remove('collapsed');
        var fh = feature.querySelector('.feature-header');
        if (fh) fh.setAttribute('aria-expanded', 'true');
      }
      if (target.classList.contains('collapsed')) {
        target.classList.remove('collapsed');
        var sh = target.querySelector('.scenario-header');
        if (sh) sh.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

// Theme picker
function initThemePicker() {
  var picker = document.querySelector('.theme-picker');
  if (!picker) return;

  var saved = localStorage.getItem('report-theme');
  if (saved) {
    picker.value = saved;
    switchReportTheme(saved);
  }

  picker.addEventListener('change', function(e) {
    switchReportTheme(e.target.value);
    localStorage.setItem('report-theme', e.target.value);
  });
}

function switchReportTheme(name) {
  document.querySelectorAll('style[data-theme-name]').forEach(function(s) {
    s.disabled = s.dataset.themeName !== name;
  });
}

// Sync TOC visibility with filters
function syncTocVisibility() {
  var sidebar = document.querySelector('.toc-sidebar');
  if (!sidebar) return;

  sidebar.querySelectorAll('.toc-scenario').forEach(function(link) {
    var href = link.getAttribute('href');
    if (!href) return;
    var target = document.querySelector(href);
    link.style.display = (target && target.style.display !== 'none') ? '' : 'none';
  });

  sidebar.querySelectorAll('.toc-feature').forEach(function(feature) {
    var visibleScenarios = feature.querySelectorAll('.toc-scenario');
    var anyVisible = Array.from(visibleScenarios).some(function(s) {
      return s.style.display !== 'none';
    });
    feature.style.display = anyVisible ? '' : 'none';
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
  initCalls.push('readUrlState();');
  initCalls.push('initSearch();');
  initCalls.push('initTagFilter();');
  initCalls.push('initStatusFilter();');
  initCalls.push('initKeyboardShortcuts();');
  initCalls.push('initCollapse();');
  initCalls.push('initDetailLevel();');
  initCalls.push('applyAllFilters();');
  initCalls.push('initHashScroll();');
  initCalls.push('initToc();');
  initCalls.push('initThemePicker();');

  const initScript = `
// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  ${initCalls.join('\n  ')}
});
`;

  let script = options.includeDarkMode ? JS_THEME : '';
  script += JS_CORE;
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
