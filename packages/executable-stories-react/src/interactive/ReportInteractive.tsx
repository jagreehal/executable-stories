'use client';

import type { StoryReport } from 'executable-stories-core';
import { Monitor, Moon, Sun } from 'lucide-react';
import {
  useCallback,
  useDeferredValue,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ReportEmpty } from '../components/ReportEmpty';
import { ReportFeatureList } from '../components/ReportFeatureList';
import { ReportMeta } from '../components/ReportMeta';
import { ReportErrorShell } from '../components/ReportShell';
import { ReportSummary } from '../components/ReportSummary';
import { Switch } from '../components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group';
import { ReportRoot } from '../context/ReportRoot';
import { reportLastRunMs } from '../lib/provenance';
import type { ScenarioHistoryMap } from '../lib/run-history';
import { scrollToScenarioId } from '../lib/scroll';
import { cn } from '../lib/utils';
import type { BuiltinRenderers, CustomRenderers } from '../renderers';
import type { Result } from '../result';
import { unwrapReport } from '../result';
import {
  CollapseProvider,
  useCollapseState,
  type CollapseApi,
} from './collapse-context';
import {
  allTags,
  filterReport,
  listFailures,
  type StatusFilter,
} from './filter';
import { ReportFailureBanner } from './ReportFailureBanner';
import { ReportFilters } from './ReportFilters';
import { ReportFreshness } from './ReportFreshness';
import { ReportLastRunDelta } from './ReportLastRunDelta';
import { ReportSearch } from './ReportSearch';
import { ReportShortcutsHelp } from './ReportShortcutsHelp';
import { ReportToc } from './ReportToc';
import { ReportTocDrawer } from './ReportTocDrawer';
import {
  ScenarioActionsProvider,
  scenarioPermalink,
  scenarioToMarkdown,
  scenarioToPrompt,
  type ScenarioActions,
} from './scenario-actions';
import { ScenarioFreshnessProvider } from './scenario-freshness-context';
import { ScenarioHistoryProvider } from './scenario-history-context';
import { defaultCollapsedIds, failuresFirst } from './triage-default';
import { useDeepLinkScroll } from './use-deep-link-scroll';
import { useKeyboardShortcuts } from './use-keyboard-shortcuts';
import { useTheme, type ThemePref } from './use-theme';
import { useUrlState } from './use-url-state';

export interface ReportInteractiveProps {
  /** A StoryReport, or a Result-wrapped one (e.g., from parseStoryReport). */
  report: StoryReport | Result<StoryReport>;
  /** Renderers keyed by `story.custom({ type })` strings. */
  customRenderers?: CustomRenderers;
  /** Optional overrides for the heavy built-ins (mermaid, code, section). */
  renderers?: BuiltinRenderers;
  className?: string;
  title?: string;
  dataTheme?: 'light' | 'dark';
  /**
   * Drop the report's own title block (`<h1>` + summary + meta) while keeping
   * the search and filter controls. Use when the surrounding page already shows
   * the report title as its heading — e.g. the Astro stories index embedded in
   * Starlight, where Starlight renders the page `<h1>`.
   */
  hideHeader?: boolean;
  /**
   * Drop the report's in-content scenario table-of-contents sidebar and render
   * the scenarios full-width. Use when the surrounding page already provides
   * scenario navigation — e.g. the Astro stories index, where the feature/
   * scenario tree lives in Starlight's own sidebar. Avoids a second nav rail.
   */
  hideToc?: boolean;
  /**
   * Days before the report is flagged as stale (warning banner instead of the
   * "Verified N ago" line). 0 disables the stale warning. Default 7.
   */
  staleAfterDays?: number;
  /**
   * Recent run events per scenario id (from the CLI's --history-file store).
   * When present, scenario cards show a run-over-run timeline strip.
   */
  scenarioHistory?: ScenarioHistoryMap;
}

export function ReportInteractive(props: ReportInteractiveProps) {
  const { report, className, title, dataTheme } = props;
  const result = unwrapReport(report);
  if (!result.ok) {
    return (
      <ReportErrorShell
        error={result.error}
        className={className}
        title={title}
        dataTheme={dataTheme}
      />
    );
  }
  return <ReportInteractiveView {...props} report={result.data} />;
}

interface ReportInteractiveViewProps extends Omit<
  ReportInteractiveProps,
  'report'
> {
  report: StoryReport;
}

const THEME_OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

// Light / System / Dark as an icon segmented control, matching the view-mode one.
function ThemeSegment({
  pref,
  onPref,
}: {
  pref: ThemePref;
  onPref: (p: ThemePref) => void;
}) {
  return (
    <ToggleGroup
      size="sm"
      value={[pref]}
      onValueChange={(v) => {
        const next = v[0] as ThemePref | undefined;
        if (next) onPref(next);
      }}
      aria-label="Color theme"
    >
      {THEME_OPTIONS.map(({ value, label, Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={label}
          title={label}
          className="px-2"
        >
          <Icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function ReportInteractiveView({
  report,
  customRenderers,
  renderers,
  className,
  title,
  dataTheme,
  hideHeader = false,
  hideToc = false,
  staleAfterDays = 7,
  scenarioHistory,
}: ReportInteractiveViewProps) {
  // Search, status, tags and detail live in the URL fragment, so a filtered
  // view survives a refresh and can be pasted to someone else.
  const [urlState, setUrlState] = useUrlState();
  const { query, status: statusFilter, tags: activeTags, detail } = urlState;
  const setQuery = useCallback(
    (next: string) => setUrlState({ query: next }),
    [setUrlState],
  );
  const setStatusFilter = useCallback(
    (next: StatusFilter) => setUrlState({ status: next }),
    [setUrlState],
  );
  const setDetail = useCallback(
    (next: 'full' | 'minimal') => setUrlState({ detail: next }),
    [setUrlState],
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const { pref: themePref, setPref: setThemePref } = useTheme();
  const searchRef = useRef<HTMLInputElement>(null);
  const expandId = useId();
  const docsId = useId();
  // Defer filtering off the live input value so typing stays responsive even
  // when the report is large — the input updates immediately, the filtered
  // tree catches up. (Vercel rerender-use-deferred-value.)
  const deferredQuery = useDeferredValue(query);
  const failures = useMemo(() => listFailures(report), [report]);
  const filtered = useMemo(
    // Features carrying failures float to the top so the first thing on screen
    // is the thing that needs attention; an all-green run keeps source order.
    () =>
      failuresFirst(
        filterReport(report, {
          query: deferredQuery,
          status: statusFilter,
          tags: activeTags,
        }),
      ),
    [report, deferredQuery, statusFilter, activeTags],
  );
  const isFiltering = query !== deferredQuery;

  const statusOptions = useMemo(() => {
    const s = report.summary;
    const opts: Array<{ key: StatusFilter; label: string; count: number }> = [
      { key: 'all', label: 'All', count: s.total },
    ];
    if (s.passed)
      opts.push({ key: 'passed', label: 'Passed', count: s.passed });
    if (s.failed)
      opts.push({ key: 'failed', label: 'Failed', count: s.failed });
    if (s.skipped)
      opts.push({ key: 'skipped', label: 'Skipped', count: s.skipped });
    if (s.pending)
      opts.push({ key: 'pending', label: 'Pending', count: s.pending });
    return opts;
  }, [report]);
  const tagOptions = useMemo(() => allTags(report), [report]);
  const toggleTag = useCallback(
    (tag: string) =>
      setUrlState({
        tags: activeTags.includes(tag)
          ? activeTags.filter((t) => t !== tag)
          : [...activeTags, tag],
      }),
    [activeTags, setUrlState],
  );

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);
  const copy = useCallback(
    (text: string, msg: string) => {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text).then(
          () => showToast(msg),
          () => showToast('Copy failed'),
        );
      }
    },
    [showToast],
  );
  const scenarioActions = useMemo<ScenarioActions>(
    () => ({
      copyLink: (s) => copy(scenarioPermalink(s), 'Link copied'),
      copyMarkdown: (s) => copy(scenarioToMarkdown(s), 'Markdown copied'),
      copyPrompt: (s) => copy(scenarioToPrompt(s), 'Prompt copied'),
    }),
    [copy],
  );
  const failureIndexRef = useRef(0);

  const allCollapsibleIds = useMemo(
    () =>
      report.features.flatMap((f) => [f.id, ...f.scenarios.map((s) => s.id)]),
    [report],
  );
  // On a run WITH failures the report opens as a triage surface: passing work
  // collapsed to titles, failures expanded (see defaultCollapsedIds). An
  // all-green run collapses nothing. Either way a persisted collapse set from a
  // previous visit wins, so this only ever seeds a first visit.
  const collapse = useCollapseState(
    useCallback(() => defaultCollapsedIds(report), [report]),
  );
  // Filtering is a temporary lens over the report, not a change to the user's
  // persisted collapse preferences. Always reveal matching features/scenarios
  // while a filter is active, then restore the previous collapse state when it
  // is cleared. Otherwise search can report a match that remains hidden inside
  // a triage-collapsed feature.
  const revealFilteredResults =
    deferredQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    activeTags.length > 0;
  const visibleCollapse = useMemo<CollapseApi>(
    () =>
      revealFilteredResults
        ? { ...collapse.api, isCollapsed: () => false }
        : collapse.api,
    [collapse.api, revealFilteredResults],
  );
  const collapseAll = useCallback(
    () => collapse.collapseAll(allCollapsibleIds),
    [collapse, allCollapsibleIds],
  );
  // "Expand all" is a single binary: checked → every scenario open, unchecked →
  // all collapsed to titles. Starts unchecked on a failing run so the control
  // matches the triage default above rather than contradicting it.
  // (Per-scenario toggles may drift from this; harmless.)
  const [expandedAll, setExpandedAll] = useState<boolean>(
    () => report.summary.failed === 0,
  );
  const setExpanded = useCallback(
    (expanded: boolean) => {
      if (expanded) collapse.expandAll();
      else collapseAll();
      setExpandedAll(expanded);
    },
    [collapse, collapseAll],
  );

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  const stepFailure = useCallback(
    (direction: 1 | -1) => {
      if (failures.length === 0) return;
      failureIndexRef.current =
        (failureIndexRef.current + direction + failures.length) %
        failures.length;
      const target = failures[failureIndexRef.current];
      if (target) scrollToScenarioId(target.scenarioId);
    },
    [failures],
  );

  const toggleHelp = useCallback(() => {
    setHelpOpen((v) => !v);
  }, []);

  const escape = useCallback(() => {
    if (helpOpen) setHelpOpen(false);
    else if (query !== '') setQuery('');
  }, [helpOpen, query, setQuery]);

  useKeyboardShortcuts({
    onFocusSearch: focusSearch,
    onNextFailure: () => stepFailure(1),
    onPrevFailure: () => stepFailure(-1),
    onToggleHelp: toggleHelp,
    onEscape: escape,
    onExpandAll: () => setExpanded(true),
    onCollapseAll: () => setExpanded(false),
  });

  useDeepLinkScroll();

  const hasContent = filtered.features.length > 0;
  const totalScenarios = report.summary.total;
  const matchedScenarios = filtered.summary.total;
  // The scenario TOC earns its rail only when there's enough to jump between.
  // For a sparse report (a few scenarios, e.g. a single Playwright story) the
  // rail is dead space that squashes the content — render full-width instead.
  // `hideToc` (host-provided nav, e.g. Astro/Starlight) always wins.
  const showToc = !hideToc && totalScenarios > 3;

  return (
    <CollapseProvider value={visibleCollapse}>
      <ScenarioActionsProvider value={scenarioActions}>
        <ScenarioHistoryProvider value={scenarioHistory ?? null}>
          <ScenarioFreshnessProvider value={{ staleAfterDays, report }}>
            <ReportRoot
              report={filtered}
              customRenderers={customRenderers}
              renderers={renderers}
            >
              <main
                className={cn('es-report', 'es-report-interactive', className)}
                aria-label={title ?? 'Test report'}
                aria-busy={isFiltering}
                data-theme={dataTheme}
                data-detail-level={detail}
              >
                <header className="es-report-header">
                  {/* Nav bar: title left, search right (search stays even when the
                host page owns the title — hideHeader). */}
                  <div
                    data-es-navbar
                    className={cn(
                      'flex flex-wrap items-center gap-4',
                      hideHeader ? 'justify-end' : 'justify-between',
                    )}
                  >
                    {hideHeader ? null : (
                      <h1 className="min-w-0">{title ?? 'Story Report'}</h1>
                    )}
                    {/* Search + theme sit together in the top-right corner — theme is
                  set-once global chrome, so it lives in the header, not down in
                  the per-list view controls. */}
                    <div className="flex items-center gap-2">
                      <ReportSearch
                        ref={searchRef}
                        value={query}
                        onChange={setQuery}
                        matchedCount={matchedScenarios}
                        totalCount={totalScenarios}
                      />
                      <ThemeSegment pref={themePref} onPref={setThemePref} />
                    </div>
                  </div>
                  {hideHeader ? null : (
                    <>
                      <ReportSummary />
                      <ReportMeta />
                    </>
                  )}
                  <ReportFreshness
                    lastRunMs={reportLastRunMs(report)}
                    ciUrl={report.ci?.url}
                    staleAfterDays={staleAfterDays}
                  />
                  <ReportLastRunDelta
                    history={scenarioHistory}
                    report={report}
                  />

                  {/* Filters first (what's shown: status, then tags)… */}
                  <ReportFilters
                    statuses={statusOptions}
                    status={statusFilter}
                    onStatus={setStatusFilter}
                    tags={tagOptions}
                    activeTags={activeTags}
                    onToggleTag={toggleTag}
                  />
                  {/* …then the view controls (how it's shown), separated by a hairline
                so "filter the data" and "change the view" read as distinct.
                Switches, not checkboxes: these are immediate on/off view modes,
                which is what a switch signals. "Show only failures" is the
                Failed status filter's job, not a view mode. */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/60 pt-3">
                    {/* Narrow-screen scenario nav (the sidebar is lg-only). */}
                    {showToc ? <ReportTocDrawer /> : null}
                    <div className="flex items-center gap-2">
                      <Switch
                        id={expandId}
                        checked={expandedAll}
                        onCheckedChange={setExpanded}
                      />
                      <label
                        htmlFor={expandId}
                        className="cursor-pointer text-sm text-muted-foreground select-none"
                      >
                        Expand all
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={docsId}
                        checked={detail === 'full'}
                        onCheckedChange={(checked) =>
                          setDetail(checked ? 'full' : 'minimal')
                        }
                      />
                      <label
                        htmlFor={docsId}
                        className="cursor-pointer text-sm text-muted-foreground select-none"
                      >
                        Show documentation
                      </label>
                    </div>
                  </div>
                </header>
                <ReportFailureBanner failures={failures} />
                {hasContent ? (
                  showToc ? (
                    <div className="flex gap-6">
                      <ReportToc />
                      <div className="flex min-w-0 flex-1 flex-col gap-4">
                        <ReportFeatureList />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <ReportFeatureList />
                    </div>
                  )
                ) : (
                  <ReportEmpty
                    message={
                      query ? 'No scenarios match the search.' : undefined
                    }
                  />
                )}
                {/* `?` is the shortcut (it is already Shift+/, so aria-keyshortcuts is
              just "?", not the malformed "Shift+?"). Character-based, so it
              works regardless of where ? sits on the user's keyboard layout. */}
                <button
                  type="button"
                  className="es-shortcuts-trigger fixed right-4 bottom-4 z-40 flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label="Keyboard shortcuts"
                  aria-keyshortcuts="?"
                  onClick={toggleHelp}
                >
                  ?
                </button>
                <ReportShortcutsHelp
                  open={helpOpen}
                  onClose={() => setHelpOpen(false)}
                />
                {toast ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-lg"
                  >
                    {toast}
                  </div>
                ) : null}
              </main>
            </ReportRoot>
          </ScenarioFreshnessProvider>
        </ScenarioHistoryProvider>
      </ScenarioActionsProvider>
    </CollapseProvider>
  );
}
