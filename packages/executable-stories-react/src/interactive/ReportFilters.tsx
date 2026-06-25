"use client";

import type { StatusFilter } from "./filter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ReportFiltersProps {
  /** Status options to show (only those present in the run), with counts. */
  statuses: Array<{ key: StatusFilter; label: string; count: number }>;
  status: StatusFilter;
  onStatus: (status: StatusFilter) => void;
  tags: string[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
}

export function ReportFilters({
  statuses,
  status,
  onStatus,
  tags,
  activeTags,
  onToggleTag,
}: ReportFiltersProps) {
  if (statuses.length === 0 && tags.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {statuses.length > 0 ? (
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1">
          {statuses.map((opt) => {
            const active = status === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                aria-pressed={active}
                onClick={() => onStatus(active && opt.key !== "all" ? "all" : opt.key)}
                className={cn(
                  "cursor-pointer rounded-md border px-2 py-1 text-xs transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {opt.label}
                <span className="ml-1 font-mono opacity-70">{opt.count}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {tags.length > 0 ? (
        <ul aria-label="Filter by tag" className="flex flex-wrap gap-1.5">
          {tags.map((tag) => {
            const active = activeTags.includes(tag);
            return (
              <li key={tag}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleTag(tag)}
                  className="cursor-pointer"
                >
                  <Badge variant={active ? "default" : "tag"}>{tag}</Badge>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
