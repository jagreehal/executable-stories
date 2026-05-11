"use client";

import {
  forwardRef,
  useId,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

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
      placeholder = "Search scenarios, tags, or step text…",
      className,
    } = props;
    const inputId = useId();
    const showCounts =
      typeof matchedCount === "number" && typeof totalCount === "number";

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
      onChange(e.target.value);
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Escape" && value !== "") {
        onChange("");
        e.preventDefault();
      }
    }

    return (
      <div className={["es-search", className].filter(Boolean).join(" ")}>
        <label htmlFor={inputId} className="es-search-label">
          Search
        </label>
        <input
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
        />
        {showCounts ? (
          <span className="es-search-counts" aria-live="polite">
            {value
              ? `${matchedCount} of ${totalCount}`
              : `${totalCount} total`}
          </span>
        ) : null}
      </div>
    );
  },
);
