"use client";

import { Bot, X } from "lucide-react";
import type { AppliedFilter } from "./webmcp-tools";

export interface ReportAgentFilterNoticeProps {
  applied: AppliedFilter;
  onReset: () => void;
  onDismiss: () => void;
}

/**
 * Says who moved the page.
 *
 * When an agent calls `filter_scenarios` the list changes under the reader with
 * nothing on screen to explain it. There is no confirmation step in front of
 * that — filtering a read-only report is not a risk worth a dialogue — so this
 * is the alternative: say what was applied, and offer the way back.
 *
 * The caller renders this only while the applied filter still matches the live
 * view state, so the notice disappears on its own the moment the reader touches
 * a filter themselves.
 */
export function ReportAgentFilterNotice({
  applied,
  onReset,
  onDismiss,
}: ReportAgentFilterNoticeProps) {
  const terms: string[] = [];
  if (applied.search) terms.push(`matching “${applied.search}”`);
  if (applied.status !== "all") terms.push(applied.status);
  if (applied.tags.length > 0) terms.push(applied.tags.join(", "));

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm"
    >
      <Bot aria-hidden className="size-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        An agent filtered this report
        {terms.length > 0 ? <> to {terms.join(" · ")}</> : null} —{" "}
        <span className="tabular-nums">
          {applied.matched} of {applied.total} scenarios
        </span>
        .
      </span>
      <button
        type="button"
        onClick={onReset}
        className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
      >
        Show all
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="cursor-pointer rounded-md p-1 text-muted-foreground hover:text-foreground"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
