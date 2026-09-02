"use client";

import { useEffect, useState } from "react";
import type { StoryReport } from "executable-stories-core";

import { formatRelativeAge } from "../lib/provenance";
import type { ScenarioRef } from "../lib/run-history";
import { cn } from "../lib/utils";
import { diffSinceVisit, snapshotOf, type VisitDelta, type VisitSnapshot } from "./last-visit";

const KEY = "es-last-visit";
const MAX_LINKS = 5;

function readVisit(): VisitSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const v = parsed as Partial<VisitSnapshot>;
    if (typeof v.runId !== "string" || typeof v.atMs !== "number" || typeof v.statuses !== "object") {
      return null;
    }
    return { runId: v.runId, atMs: v.atMs, statuses: v.statuses as VisitSnapshot["statuses"] };
  } catch {
    // Disabled storage, or a snapshot written by an older shape. Either way the
    // reader just gets no strip — never a crashed report.
    return null;
  }
}

function writeVisit(snapshot: VisitSnapshot): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* disabled / quota */
  }
}

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
 * "Since your last visit" — the delta against what THIS reader last saw, which
 * on a tab opened a week later is a different question from what the last run
 * changed. Reads and writes one localStorage key: the snapshot never leaves the
 * browser, and a reader with storage disabled simply sees no strip.
 *
 * Runs in an effect (not during render) because it touches storage and the
 * clock — the server render and the first client paint have to agree.
 */
export function ReportSinceLastVisit({ report }: { report: StoryReport }) {
  const [delta, setDelta] = useState<VisitDelta | null>(null);
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    const now = Date.now();
    setDelta(diffSinceVisit(readVisit(), report));
    setNowMs(now);
    writeVisit(snapshotOf(report, now));
  }, [report]);

  if (!delta) return null;
  const { newlyFailing, newlyPassing, added } = delta;

  return (
    <p className="text-xs text-muted-foreground" data-testid="es-since-last-visit">
      <span className="font-medium text-foreground">
        Since your last visit ({formatRelativeAge(delta.sinceMs, nowMs)}):
      </span>
      {newlyFailing.length > 0 ? (
        <span className="ml-2 text-fail">
          {newlyFailing.length} started failing (<ScenarioLinks scenarios={newlyFailing} tone="text-fail" />)
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
