import type { StoryReport } from "executable-stories-core";

import { diffSinceLastRun, type ScenarioHistoryMap, type ScenarioRef } from "../lib/run-history";
import { cn } from "@/lib/utils";

const MAX_LINKS = 5;

function ScenarioLinks({ scenarios, tone }: { scenarios: ScenarioRef[]; tone: string }) {
  return (
    <>
      {scenarios.slice(0, MAX_LINKS).map((s, i) => (
        <span key={s.id}>
          {i > 0 ? ", " : ""}
          <a href={`#${s.id}`} className={cn("underline underline-offset-2 hover:no-underline", tone)}>
            {s.title}
          </a>
        </span>
      ))}
      {scenarios.length > MAX_LINKS ? <span> and {scenarios.length - MAX_LINKS} more</span> : null}
    </>
  );
}

/**
 * One-line "what changed since the previous run" strip for the report header:
 * newly failing, newly passing, and first-seen scenarios, computed from the
 * embedded history store. Renders nothing without a previous run to compare
 * (no --history-file, or the first run with history enabled). Takes the
 * unfiltered report so search and filter chips never change the delta.
 */
export function ReportLastRunDelta({
  history,
  report,
}: {
  history: ScenarioHistoryMap | undefined;
  report: StoryReport;
}) {
  if (!history) return null;
  const scenarios = report.features.flatMap((f) => f.scenarios.map((s) => ({ id: s.id, title: s.title })));
  const delta = diffSinceLastRun(history, scenarios);
  if (!delta) return null;

  const { newlyFailing, newlyPassing, added } = delta;
  if (newlyFailing.length === 0 && newlyPassing.length === 0 && added.length === 0) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="es-last-run-delta">
        Since last run: no behavior changes.
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground" data-testid="es-last-run-delta">
      <span className="font-medium text-foreground">Since last run:</span>
      {newlyFailing.length > 0 ? (
        <span className="ml-2 text-fail">
          {newlyFailing.length} newly failing (<ScenarioLinks scenarios={newlyFailing} tone="text-fail" />)
        </span>
      ) : null}
      {newlyPassing.length > 0 ? (
        <span className="ml-2 text-pass">
          {newlyPassing.length} fixed (<ScenarioLinks scenarios={newlyPassing} tone="text-pass" />)
        </span>
      ) : null}
      {added.length > 0 ? <span className="ml-2">{added.length} new</span> : null}
    </p>
  );
}
