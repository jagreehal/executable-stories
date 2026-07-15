"use client";

import { useEffect, useMemo, useState } from "react";
import { useReport } from "../hooks/useReport";
import { scrollToScenarioId } from "../lib/scroll";
import { cn } from "@/lib/utils";

const DOT: Record<string, string> = {
  passed: "bg-pass",
  failed: "bg-fail",
  skipped: "bg-skip",
  pending: "bg-pend",
};

/**
 * The table-of-contents list + scroll-spy, shared by the sticky `ReportToc`
 * sidebar (lg+) and the narrow-screen `ReportTocDrawer`. Tracks the scenario
 * nearest the top of the viewport via IntersectionObserver. `onNavigate` fires
 * after a link is followed, so the drawer can close itself.
 */
export function TocContent({ onNavigate }: { onNavigate?: () => void }) {
  const report = useReport();
  const [activeId, setActiveId] = useState<string | null>(null);

  const scenarioIds = useMemo(
    () => report.features.flatMap((f) => f.scenarios.map((s) => s.id)),
    [report],
  );

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = scenarioIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-8% 0px -80% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [scenarioIds]);

  if (report.features.length === 0) return null;

  // `list-none pl-0` explicitly: the drawer portals OUTSIDE `.es-report-island`,
  // so it can't rely on the island's list reset — bullets would leak otherwise.
  return (
    <ul className="flex list-none flex-col gap-4 pl-0">
      {report.features.map((feature) => (
        <li key={feature.id}>
          <p className="mb-1.5 font-semibold leading-snug text-foreground">{feature.title}</p>
          <ul className="flex list-none flex-col gap-0.5 pl-0">
            {feature.scenarios.map((scenario) => {
              const active = activeId === scenario.id;
              return (
                <li key={scenario.id}>
                  <a
                    href={`#${scenario.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToScenarioId(scenario.id, { updateHash: true });
                      onNavigate?.();
                    }}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex items-start gap-2 border-l-2 py-1 pl-2.5 leading-snug hover:text-foreground",
                      active
                        ? "border-primary font-medium text-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn("mt-1 size-1.5 shrink-0 rounded-full", DOT[scenario.status])}
                    />
                    <span className="break-words">{scenario.title}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

/**
 * Sticky table-of-contents nav for the interactive report (lg+ only). On
 * narrow screens it's hidden and `ReportTocDrawer` provides the same nav.
 */
export function ReportToc() {
  const report = useReport();
  if (report.features.length === 0) return null;
  return (
    <nav
      aria-label="Table of contents"
      className="sticky top-4 hidden h-fit w-64 shrink-0 self-start text-xs lg:block"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Contents
      </p>
      <TocContent />
    </nav>
  );
}
