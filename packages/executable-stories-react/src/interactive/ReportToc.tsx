"use client";

import { useEffect, useMemo, useState } from "react";
import { useReport } from "../hooks/useReport";
import { scrollToScenarioId } from "../lib/scroll";
import { cn } from "@/lib/utils";

const DOT: Record<string, string> = {
  passed: "text-pass",
  failed: "text-fail",
  skipped: "text-skip",
  pending: "text-pend",
};

/**
 * Sticky table-of-contents nav for the interactive report. Reads the (filtered)
 * report from context, so it syncs with search/status/tag filters automatically.
 * Tracks the scenario nearest the top of the viewport via IntersectionObserver.
 */
export function ReportToc() {
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

  return (
    <nav
      aria-label="Table of contents"
      className="sticky top-4 hidden h-fit w-56 shrink-0 self-start text-xs lg:block"
    >
      <ul className="flex flex-col gap-3">
        {report.features.map((feature) => (
          <li key={feature.id}>
            <p className="mb-1 truncate font-semibold text-foreground">{feature.title}</p>
            <ul className="flex flex-col">
              {feature.scenarios.map((scenario) => {
                const active = activeId === scenario.id;
                return (
                  <li key={scenario.id}>
                    <a
                      href={`#${scenario.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToScenarioId(scenario.id, { updateHash: true });
                      }}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex items-center gap-1.5 truncate border-l-2 py-0.5 pl-2 hover:text-foreground",
                        active
                          ? "border-primary font-medium text-foreground"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      <span aria-hidden className={cn("shrink-0", DOT[scenario.status])}>•</span>
                      <span className="truncate">{scenario.title}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
