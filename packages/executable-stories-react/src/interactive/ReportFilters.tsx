"use client";

import { useState } from "react";
import type { StatusFilter } from "./filter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Above this many tags the filter list collapses to one row behind a "+N more"
// toggle, so a tag-heavy report doesn't open with a tall grey brick before the
// content. Small reports (≤ limit) show every tag, no toggle.
const TAG_LIMIT = 12;

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
  // Local view-only state (tag list expanded or collapsed). The parent still
  // owns the domain filters — selected status and active tags — so this doesn't
  // break the component's presentational contract.
  const [showAllTags, setShowAllTags] = useState(false);
  if (statuses.length === 0 && tags.length === 0) return null;
  const tagsCollapsed = tags.length > TAG_LIMIT && !showAllTags;
  const visibleTags = tagsCollapsed ? tags.slice(0, TAG_LIMIT) : tags;
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
        <ul aria-label="Filter by tag" className="flex flex-wrap items-center gap-1.5">
          {visibleTags.map((tag) => {
            const active = activeTags.includes(tag);
            return (
              <li key={tag}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleTag(tag)}
                  className="cursor-pointer"
                >
                  {/* Always the `tag` variant (font-mono) so the active state
                      only swaps colours, never the font family. Switching to a
                      sans variant on select would change the pill's width and
                      reflow every sibling. */}
                  <Badge
                    variant="tag"
                    className={cn(
                      active && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {tag}
                  </Badge>
                </button>
              </li>
            );
          })}
          {tags.length > TAG_LIMIT ? (
            <li>
              <button
                type="button"
                aria-expanded={showAllTags}
                onClick={() => setShowAllTags((v) => !v)}
                className="cursor-pointer rounded-full px-2 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {tagsCollapsed ? `+${tags.length - TAG_LIMIT} more` : "Show fewer"}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
