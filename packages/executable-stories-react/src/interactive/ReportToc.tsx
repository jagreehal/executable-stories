"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const listRef = useRef<HTMLUListElement>(null);

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

    // Measured from every card on each scroll rather than from
    // IntersectionObserver entries. An observer callback only carries the
    // elements whose visibility just changed, so once the page is scrolled past
    // the last card nothing changes again and the highlight stays on whichever
    // scenario crossed the band last, several screens above what is on screen.
    let frame = 0;
    const update = () => {
      frame = 0;
      // The reading line: a fifth down the viewport. Active = the last card
      // that has crossed it, or the first card when none has yet. At the very
      // bottom of the document the line stops moving and the last few cards
      // can never cross it, so there the whole viewport is the line.
      const atBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2;
      const line = atBottom ? window.innerHeight : window.innerHeight * 0.2;
      let active = els[0]!;
      let best = -Infinity;
      for (const el of els) {
        const top = el.getBoundingClientRect().top;
        if (top <= line && top > best) {
          best = top;
          active = el;
        }
      }
      setActiveId(active.id);
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

  // Keep the active link visible inside the TOC's own scroll box (the sidebar
  // nav or the drawer popup). Set scrollTop directly: scrollIntoView would also
  // scroll the window. The sidebar's sticky "Contents" label covers its top.
  useEffect(() => {
    const list = listRef.current;
    const box = list?.parentElement;
    const link = list?.querySelector<HTMLElement>("[aria-current]");
    if (!box || !link) return;
    const label = box.tagName === "NAV" ? (box.firstElementChild as HTMLElement | null) : null;
    const b = box.getBoundingClientRect();
    const top = b.top + (label && label !== list ? label.offsetHeight : 0);
    const l = link.getBoundingClientRect();
    if (l.top < top) box.scrollTop += l.top - top - 16;
    else if (l.bottom > b.bottom) box.scrollTop += l.bottom - b.bottom + 16;
  }, [activeId]);

  if (report.features.length === 0) return null;

  // `list-none pl-0` explicitly: the drawer portals OUTSIDE `.es-report-island`,
  // so it can't rely on the island's list reset — bullets would leak otherwise.
  return (
    <ul ref={listRef} className="flex list-none flex-col gap-4 pl-0">
      {report.features.map((feature) => (
        <li key={feature.id}>
          <p className="mb-1.5 font-semibold leading-snug text-foreground">{feature.title}</p>
          {/* The rail lives on the list so it stays one unbroken line; the active
              link overlays it with its own 2px border. */}
          <ul className="flex list-none flex-col gap-0.5 border-l-2 border-border pl-0">
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
                      // One font weight for every state keeps the active link from rewrapping.
                      // Inset ring because the scroll box clips outlines.
                      "-ml-0.5 flex items-start gap-2 rounded-r-sm border-l-2 py-1 pl-2.5 leading-snug no-underline outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                      active
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn("mt-1 size-1.5 shrink-0 rounded-full", DOT[scenario.status])}
                    />
                    {/* Explicit wrap: the drawer portals outside the island's root rule. */}
                    <span dir="auto" className="min-w-0 wrap-anywhere">{scenario.title}</span>
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
  const empty = report.features.length === 0;
  const navRef = useRef<HTMLElement>(null);

  // Fade the bottom edge while more links sit below it.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () =>
      nav.toggleAttribute(
        "data-more-below",
        nav.scrollTop + nav.clientHeight < nav.scrollHeight - 1,
      );
    update();
    nav.addEventListener("scroll", update, { passive: true });
    // Filtering changes the list's length; the nav's own box changes with the viewport.
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    ro?.observe(nav);
    if (nav.lastElementChild) ro?.observe(nav.lastElementChild);
    return () => {
      nav.removeEventListener("scroll", update);
      ro?.disconnect();
    };
  }, [empty]);

  if (empty) return null;
  return (
    <nav
      ref={navRef}
      aria-label="Table of contents"
      className="es-report-toc sticky top-4 hidden max-h-[calc(100dvh-2rem)] w-64 shrink-0 self-start overflow-y-auto overscroll-contain pr-2 text-xs data-[more-below]:[mask-image:linear-gradient(to_bottom,black_calc(100%-2.5rem),transparent)] lg:block"
    >
      {/* Pinned inside the nav's own scroll box so the list keeps its heading. */}
      <p className="sticky top-0 z-10 mb-0 bg-background pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Contents
      </p>
      <TocContent />
    </nav>
  );
}
