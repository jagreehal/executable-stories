"use client";

import { useEffect, useState } from "react";
import { formatRelativeAge, isReportStale } from "../lib/provenance";

export interface ReportFreshnessProps {
  /** Epoch ms of the run this report documents (see reportLastRunMs). */
  lastRunMs?: number;
  /** CI run URL, linked from the banner so readers can check for newer runs. */
  ciUrl?: string;
  /** Days before the report counts as stale; 0 disables the warning. */
  staleAfterDays: number;
  /** Test seam: fixed "now"; defaults to Date.now() on mount. */
  nowMs?: number;
}

/**
 * The report's freshness signal. Fresh reports get a one-line "Last verified
 * N ago" status; reports older than `staleAfterDays` get a warning banner —
 * living documentation is only trustworthy while it is recent.
 *
 * Age is computed on mount (never during server render): the static HTML is
 * generated once but read later, so any age baked in at build time would lie.
 */
export function ReportFreshness({ lastRunMs, ciUrl, staleAfterDays, nowMs }: ReportFreshnessProps) {
  const [now, setNow] = useState<number | undefined>(nowMs);
  useEffect(() => {
    if (nowMs === undefined) setNow(Date.now());
  }, [nowMs]);

  if (lastRunMs === undefined || now === undefined) return null;

  const age = formatRelativeAge(lastRunMs, now);
  const runLink = ciUrl ? (
    <a
      href={ciUrl}
      target="_blank"
      rel="noreferrer noopener"
      className="underline underline-offset-2"
    >
      View CI run
    </a>
  ) : null;

  if (isReportStale(lastRunMs, staleAfterDays, now)) {
    return (
      <div className="es-stale-banner" role="status" aria-label="Report freshness">
        <span>
          <strong>Last verified {age}.</strong> This report may no longer match the current
          behavior — look for a newer run.
        </span>
        {runLink}
      </div>
    );
  }

  return (
    <p className="es-freshness" aria-label="Report freshness">
      Verified {age}
      {runLink ? <> · {runLink}</> : null}
    </p>
  );
}
