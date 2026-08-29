"use client";

import { useEffect, useState } from "react";
import { formatRelativeAge, isReportStale } from "../lib/provenance";
import { useScenarioFreshness } from "../interactive/scenario-freshness-context";
import { Badge } from "@/components/ui/badge";

/**
 * Per-scenario age signal.
 *
 * A report assembled from accumulated runs can be freshly rendered while some
 * of its scenarios last ran weeks ago. The report-level banner speaks for the
 * run, not for those scenarios, so without this the carried-over ones borrow a
 * freshness they have not earned.
 *
 * Only scenarios that are actually old say anything: a scenario that ran in
 * this run is the normal case and adds no badge. Age is computed on mount for
 * the same reason the report banner does it — static HTML is generated once and
 * read later, so an age baked in at build time would lie.
 */
export function ScenarioStaleness({ scenario }: { scenario: { lastRunAtMs?: number } }) {
  const freshness = useScenarioFreshness();
  const fixedNow = freshness?.nowMs;
  const [now, setNow] = useState<number | undefined>(fixedNow);

  useEffect(() => {
    if (fixedNow === undefined) setNow(Date.now());
  }, [fixedNow]);

  if (!freshness || now === undefined) return null;

  // No stamp means the report predates stamping, or came straight from one run.
  // Either way the report-level signal already speaks for it.
  const lastRunAtMs = scenario.lastRunAtMs;
  if (!lastRunAtMs || lastRunAtMs <= 0) return null;
  if (!isReportStale(lastRunAtMs, freshness.staleAfterDays, now)) return null;

  return (
    <Badge variant="outline" aria-label="Scenario freshness">
      Last ran {formatRelativeAge(lastRunAtMs, now)}
    </Badge>
  );
}
