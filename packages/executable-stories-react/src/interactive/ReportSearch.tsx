"use client";

import {
  forwardRef,
  useId,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, formatCount } from "@/lib/utils";

export interface ReportSearchProps {
  value: string;
  onChange: (next: string) => void;
  matchedCount?: number;
  totalCount?: number;
  placeholder?: string;
  className?: string;
}

export const ReportSearch = forwardRef<HTMLInputElement, ReportSearchProps>(
  function ReportSearch(props, ref) {
    const {
      value,
      onChange,
      matchedCount,
      totalCount,
      placeholder = "Search scenarios, tags, tickets, errors…",
      className,
    } = props;
    const inputId = useId();
    // Only surface a count once the user is actually filtering — the "All N"
    // status tab already shows the total, so a resting "N total" is duplication.
    const showCounts =
      value.trim().length > 0 &&
      typeof matchedCount === "number" &&
      typeof totalCount === "number";

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
      onChange(e.target.value);
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Escape" && value !== "") {
        onChange("");
        e.preventDefault();
      }
    }

    // `es-search` is kept only as the print-hide hook (styles.css @media print);
    // all styling is the shadcn Input + utilities now.
    return (
      <div className={cn("es-search relative flex flex-col", className)}>
        <label htmlFor={inputId} className="sr-only">
          Search
        </label>
        <div className="relative w-full sm:w-72">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={ref}
            id={inputId}
            type="search"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            aria-keyshortcuts="/"
            // Ellipsis when the placeholder outgrows a phone screen.
            className={cn("peer pl-8 text-ellipsis", value === "" && "pointer-fine:pr-8")}
          />
          {/* `/` shortcut hint on devices with a keyboard; hidden on focus. */}
          {value === "" ? (
            <kbd
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[0.6875rem] leading-4 text-muted-foreground pointer-fine:block peer-focus:hidden"
            >
              /
            </kbd>
          ) : null}
        </div>
        {showCounts ? (
          <span
            // Absolute, in the gap below, so the header keeps its height while you type.
            className="absolute top-full right-0 text-xs leading-4 tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            {formatCount(matchedCount)} of {formatCount(totalCount)}{" "}
            {totalCount === 1 ? "scenario" : "scenarios"}
          </span>
        ) : null}
      </div>
    );
  },
);
