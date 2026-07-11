"use client";

import {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import type { StoryReport } from "executable-stories-core";
import type { Result } from "../result";
import { unwrapReport } from "../result";
import type { BuiltinRenderers, CustomRenderers } from "../renderers";
import { ReportRoot } from "../context/ReportRoot";
import { ReportFeatureList } from "../components/ReportFeatureList";
import { ReportEmpty } from "../components/ReportEmpty";
import { ReportTitleBlock, ReportErrorShell } from "../components/ReportShell";
import { cn } from "../lib/utils";
import { ReportSearch } from "./ReportSearch";
import { ReportFailureBanner } from "./ReportFailureBanner";
import { ReportFreshness } from "./ReportFreshness";
import { ReportLastRunDelta } from "./ReportLastRunDelta";
import { reportLastRunMs } from "../lib/provenance";
import { ScenarioHistoryProvider } from "./scenario-history-context";
import type { ScenarioHistoryMap } from "../lib/run-history";
import { ReportShortcutsHelp } from "./ReportShortcutsHelp";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
import { useDeepLinkScroll } from "./use-deep-link-scroll";
import { filterReport, listFailures, allTags, type StatusFilter } from "./filter";
import { scrollToScenarioId } from "../lib/scroll";
import { CollapseProvider, useCollapseState } from "./collapse-context";
import { ReportFilters } from "./ReportFilters";
import { ReportToc } from "./ReportToc";
import { useTheme } from "./use-theme";
import {
  ScenarioActionsProvider,
  scenarioToMarkdown,
  scenarioToPrompt,
  scenarioPermalink,
  type ScenarioActions,
} from "./scenario-actions";

export interface ReportInteractiveProps {
  /** A StoryReport, or a Result-wrapped one (e.g., from parseStoryReport). */
  report: StoryReport | Result<StoryReport>;
  /** Renderers keyed by `story.custom({ type })` strings. */
  customRenderers?: CustomRenderers;
  /** Optional overrides for the heavy built-ins (mermaid, code, section). */
  renderers?: BuiltinRenderers;
  className?: string;
  title?: string;
  dataTheme?: "light" | "dark";
  /**
   * Drop the report's own title block (`<h1>` + summary + meta) while keeping
   * the search and filter controls. Use when the surrounding page already shows
   * the report title as its heading — e.g. the Astro stories index embedded in
   * Starlight, where Starlight renders the page `<h1>`.
   */
  hideHeader?: boolean;
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
    return <ReportErrorShell error={result.error} className={className} title={title} dataTheme={dataTheme} />;
  }
  return <ReportInteractiveView {...props} report={result.data} />;
}

interface ReportInteractiveViewProps extends Omit<ReportInteractiveProps, "report"> {
  report: StoryReport;
}

function ReportInteractiveView({
  report,
  customRenderers,
  renderers,
  className,
  title,
  dataTheme,
  hideHeader = false,
  staleAfterDays = 7,
  scenarioHistory,
}: ReportInteractiveViewProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [detail, setDetail] = useState<"full" | "minimal">("full");
  const [helpOpen, setHelpOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const searchRef = useRef<HTMLInputElement>(null);
  // Defer filtering off the live input value so typing stays responsive even
  // when the report is large — the input updates immediately, the filtered
  // tree catches up. (Vercel rerender-use-deferred-value.)
  const deferredQuery = useDeferredValue(query);
  const failures = useMemo(() => listFailures(report), [report]);
  const filtered = useMemo(
    () => filterReport(report, { query: deferredQuery, status: statusFilter, tags: activeTags }),
    [report, deferredQuery, statusFilter, activeTags],
  );
  const isFiltering = query !== deferredQuery;

  const statusOptions = useMemo(() => {
    const s = report.summary;
    const opts: Array<{ key: StatusFilter; label: string; count: number }> = [
      { key: "all", label: "All", count: s.total },
    ];
    if (s.passed) opts.push({ key: "passed", label: "Passed", count: s.passed });
    if (s.failed) opts.push({ key: "failed", label: "Failed", count: s.failed });
    if (s.skipped) opts.push({ key: "skipped", label: "Skipped", count: s.skipped });
    if (s.pending) opts.push({ key: "pending", label: "Pending", count: s.pending });
    return opts;
  }, [report]);
  const tagOptions = useMemo(() => allTags(report), [report]);
  const toggleTag = useCallback(
    (tag: string) =>
      setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])),
    [],
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
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast(msg), () => showToast("Copy failed"));
      }
    },
    [showToast],
  );
  const scenarioActions = useMemo<ScenarioActions>(
    () => ({
      copyLink: (s) => copy(scenarioPermalink(s), "Link copied"),
      copyMarkdown: (s) => copy(scenarioToMarkdown(s), "Markdown copied"),
      copyPrompt: (s) => copy(scenarioToPrompt(s), "Prompt copied"),
    }),
    [copy],
  );
  const failureIndexRef = useRef(0);

  const collapse = useCollapseState();
  const allCollapsibleIds = useMemo(
    () => report.features.flatMap((f) => [f.id, ...f.scenarios.map((s) => s.id)]),
    [report],
  );
  const collapseAll = useCallback(() => collapse.collapseAll(allCollapsibleIds), [collapse, allCollapsibleIds]);

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  const stepFailure = useCallback(
    (direction: 1 | -1) => {
      if (failures.length === 0) return;
      failureIndexRef.current =
        (failureIndexRef.current + direction + failures.length) % failures.length;
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
    else if (query !== "") setQuery("");
  }, [helpOpen, query]);

  useKeyboardShortcuts({
    onFocusSearch: focusSearch,
    onNextFailure: () => stepFailure(1),
    onPrevFailure: () => stepFailure(-1),
    onToggleHelp: toggleHelp,
    onEscape: escape,
    onExpandAll: collapse.expandAll,
    onCollapseAll: collapseAll,
  });

  useDeepLinkScroll();

  const hasContent = filtered.features.length > 0;
  const totalScenarios = report.summary.total;
  const matchedScenarios = filtered.summary.total;

  return (
    <CollapseProvider value={collapse.api}>
     <ScenarioActionsProvider value={scenarioActions}>
      <ScenarioHistoryProvider value={scenarioHistory ?? null}>
      <ReportRoot
        report={filtered}
        customRenderers={customRenderers}
        renderers={renderers}
      >
        <main
          className={cn("es-report", "es-report-interactive", className)}
          aria-label={title ?? "Test report"}
          aria-busy={isFiltering}
          data-theme={dataTheme}
          data-detail-level={detail}
        >
          <header className="es-report-header">
            {hideHeader ? null : <ReportTitleBlock title={title} />}
            <ReportFreshness
              lastRunMs={reportLastRunMs(report)}
              ciUrl={report.ci?.url}
              staleAfterDays={staleAfterDays}
            />
            <ReportLastRunDelta history={scenarioHistory} report={report} />

            <div className="flex flex-wrap items-center gap-2">
              <ReportSearch
                ref={searchRef}
                value={query}
                onChange={setQuery}
                matchedCount={matchedScenarios}
                totalCount={totalScenarios}
              />
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={collapse.expandAll}
                  aria-keyshortcuts="e"
                  className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  aria-keyshortcuts="c"
                  className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Collapse all
                </button>
                <button
                  type="button"
                  onClick={() => setDetail((d) => (d === "full" ? "minimal" : "full"))}
                  aria-pressed={detail === "minimal"}
                  className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {detail === "full" ? "Hide docs" : "Show docs"}
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                  className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {theme === "dark" ? "☀ Light" : "☾ Dark"}
                </button>
              </div>
            </div>
            <ReportFilters
              statuses={statusOptions}
              status={statusFilter}
              onStatus={setStatusFilter}
              tags={tagOptions}
              activeTags={activeTags}
              onToggleTag={toggleTag}
            />
          </header>
          <ReportFailureBanner failures={failures} />
          {hasContent ? (
            <div className="flex gap-6">
              <ReportToc />
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <ReportFeatureList />
              </div>
            </div>
          ) : (
            <ReportEmpty message={query ? "No scenarios match the search." : undefined} />
          )}
          <button
            type="button"
            className="es-shortcuts-trigger"
            aria-label="Keyboard shortcuts"
            aria-keyshortcuts="Shift+?"
            onClick={toggleHelp}
          >
            ?
          </button>
          <ReportShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
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
      </ScenarioHistoryProvider>
     </ScenarioActionsProvider>
    </CollapseProvider>
  );
}
