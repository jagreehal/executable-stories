"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import type { StoryReport } from "executable-stories-formatters";
import type { Result } from "../result";
import type { BuiltinRenderers, CustomRenderers } from "../renderers";
import { ReportRoot } from "../context/ReportRoot";
import { ReportSummary } from "../components/ReportSummary";
import { ReportFeatureList } from "../components/ReportFeatureList";
import { ReportEmpty } from "../components/ReportEmpty";
import { ReportSchemaError } from "../components/ReportSchemaError";
import { ReportSearch } from "./ReportSearch";
import { ReportFailureBanner } from "./ReportFailureBanner";
import { ReportShortcutsHelp } from "./ReportShortcutsHelp";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
import { useDeepLinkScroll } from "./use-deep-link-scroll";
import { filterReport, listFailures } from "./filter";

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
}

function isResult(value: ReportInteractiveProps["report"]): value is Result<StoryReport> {
  return typeof value === "object"
    && value !== null
    && "ok" in (value as object)
    && typeof (value as { ok: unknown }).ok === "boolean";
}

export function ReportInteractive(props: ReportInteractiveProps) {
  const { report, className, title, dataTheme } = props;

  if (isResult(report)) {
    if (!report.ok) {
      return (
        <main
          className={["es-report", className].filter(Boolean).join(" ")}
          aria-label={title ?? "Test report"}
          data-theme={dataTheme}
        >
          <ReportSchemaError error={report.error} />
        </main>
      );
    }
    return <ReportInteractiveView {...props} report={report.data} />;
  }

  return <ReportInteractiveView {...props} report={report} />;
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
}: ReportInteractiveViewProps) {
  const [query, setQuery] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const failures = useMemo(() => listFailures(report), [report]);
  const filtered = useMemo(() => filterReport(report, query), [report, query]);
  const failureIndexRef = useRef(0);

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  const scrollToScenario = useCallback((scenarioId: string) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(scenarioId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof history !== "undefined") {
      history.replaceState(null, "", `#${scenarioId}`);
    }
  }, []);

  const stepFailure = useCallback(
    (direction: 1 | -1) => {
      if (failures.length === 0) return;
      failureIndexRef.current =
        (failureIndexRef.current + direction + failures.length) % failures.length;
      const target = failures[failureIndexRef.current];
      if (target) scrollToScenario(target.scenarioId);
    },
    [failures, scrollToScenario],
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
  });

  useDeepLinkScroll();

  const hasContent = filtered.features.length > 0;
  const totalScenarios = report.summary.total;
  const matchedScenarios = filtered.summary.total;

  return (
    <ReportRoot
      report={filtered}
      customRenderers={customRenderers}
      renderers={renderers}
    >
      <main
        className={["es-report", "es-report-interactive", className].filter(Boolean).join(" ")}
        aria-label={title ?? "Test report"}
        data-theme={dataTheme}
      >
        <header className="es-report-header">
          <h1>{title ?? "Story Report"}</h1>
          <ReportSummary />
          <ReportSearch
            ref={searchRef}
            value={query}
            onChange={setQuery}
            matchedCount={matchedScenarios}
            totalCount={totalScenarios}
          />
        </header>
        <ReportFailureBanner failures={failures} />
        {hasContent ? <ReportFeatureList /> : <ReportEmpty message={query ? "No scenarios match the search." : undefined} />}
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
      </main>
    </ReportRoot>
  );
}
