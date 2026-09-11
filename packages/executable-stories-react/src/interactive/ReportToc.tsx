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
    if (typeof window === "undefined") return;
    const els = scenarioIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    // Measured from every card on each scroll, not from IntersectionObserver
    // entries. An observer callback only carries the elements whose visibility
    // just CHANGED, so once the page is scrolled past the last card nothing
    // changes again and the highlight stays stuck on whichever scenario
    // crossed the band last — the reported bug: at the bottom of the report the
    // sidebar named a card several screens up.
    let frame = 0;
    const update = () => {
      frame = 0;
      // The reading line: a fifth down the viewport. Active = the last card
      // that has crossed it, or the first card when none has yet.
      //
      // At the very bottom of the document the line stops moving, so the last
      // few cards can never cross it and the highlight sticks several screens
      // above what fills the screen. There the whole viewport is the line: the
      // last card that has started wins.
      const atBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2;
      const line = atBottom ? window.innerHeight : window.innerHeight * 0.2;
      let active = els[0]!;
      let best = -Infinity;
      let firstId: string | null = null;
      let firstTop = Infinity;
      for (const el of els) {
        const top = el.getBoundingClientRect().top;
        if (top <= line && top > best) {
          best = top;
          active = el;
        }
        if (top < firstTop) {
          firstTop = top;
          firstId = el.id;
        }
      }
      setActiveId(best === -Infinity ? firstId : active.id);
    };

    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
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
