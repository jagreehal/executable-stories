"use client";

import {
  forwardRef,
  useId,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
      placeholder = "Search scenarios or tags…",
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
      <div className={cn("es-search flex flex-col gap-1", className)}>
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
            className="pl-8"
          />
        </div>
        {showCounts ? (
          <span
            className="text-xs tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            {matchedCount} of {totalCount} scenarios
          </span>
        ) : null}
      </div>
    );
  },
);
