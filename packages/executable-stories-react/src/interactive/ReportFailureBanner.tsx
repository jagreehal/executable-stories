"use client";

import { useCallback } from "react";
import type { FailureRef } from "./filter";
import { scrollToScenarioId } from "../lib/scroll";

export interface ReportFailureBannerProps {
  failures: readonly FailureRef[];
}

export function ReportFailureBanner({ failures }: ReportFailureBannerProps) {
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
        aria-label="Jump to first failure"
      >
        Jump to first ↓
      </button>
    </div>
  );
}
