"use client";

import { useCallback } from "react";
import type { FailureRef } from "./filter";
import { scrollToScenarioId } from "../lib/scroll";

export interface ReportFailureBannerProps {
  failures: readonly FailureRef[];
  /** Copies every failure as one agent prompt. Omitted on a static render. */
  onCopyAll?: () => void;
}

export function ReportFailureBanner({ failures, onCopyAll }: ReportFailureBannerProps) {
  const first = failures[0];

  const jumpToFirst = useCallback(() => {
    if (!first) return;
    scrollToScenarioId(first.scenarioId);
  }, [first]);

  if (failures.length === 0) return null;

  // A live status region: `role="status"` is not a valid role on <aside>
  // (whose implicit role is `complementary`), so use a <div> to carry it.
  return (
    <div
      className="es-failure-banner"
      role="status"
      aria-live="polite"
      aria-label="Failure summary"
    >
      <span className="es-failure-banner-text">
        <strong>{failures.length}</strong>{" "}
        failure{failures.length === 1 ? "" : "s"}
      </span>
      <button
        type="button"
        className="es-failure-banner-jump"
        onClick={jumpToFirst}
        aria-label="View first failure"
      >
        View first failure ↓
      </button>
      {onCopyAll ? (
        <button
          type="button"
          className="es-failure-banner-jump"
          onClick={onCopyAll}
          aria-label="Copy failures for an agent"
        >
          Copy {failures.length} failure{failures.length === 1 ? "" : "s"} for an agent
        </button>
      ) : null}
    </div>
  );
}
