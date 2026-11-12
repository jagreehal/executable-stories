"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Floating "back to top" button, stacked above the `?` shortcuts trigger. It
 * shows once the reader is a screen down, jumps instantly, and moves focus to
 * the enclosing `<main>` (tabIndex -1) because the button hides at the top.
 */
export function ReportBackToTop() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top"
      // Hidden, not unmounted, so it can fade; `invisible` also drops it from
      // the tab order and the accessibility tree.
      className={cn(
        "es-back-to-top fixed right-4 bottom-15 z-40 flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97] pointer-coarse:bottom-17 pointer-coarse:size-11 [&_svg]:size-4",
        "transition-[opacity,scale,visibility,color,background-color] duration-150 ease-snappy motion-reduce:transition-none",
        shown ? "visible opacity-100" : "invisible scale-95 opacity-0",
      )}
      onClick={(e) => {
        window.scrollTo(0, 0);
        e.currentTarget.closest("main")?.focus({ preventScroll: true });
      }}
    >
      <ArrowUp aria-hidden />
    </button>
  );
}
