"use client";

import { useCallback } from "react";
import type { FailureRef } from "./filter";

export interface ReportFailureBannerProps {
  failures: readonly FailureRef[];
}

export function ReportFailureBanner({ failures }: ReportFailureBannerProps) {
  const first = failures[0];

  const jumpToFirst = useCallback(() => {
    if (!first) return;
    if (typeof window === "undefined") return;
    const el = document.getElementById(first.scenarioId);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof history !== "undefined") {
      history.replaceState(null, "", `#${first.scenarioId}`);
    }
  }, [first]);

  if (failures.length === 0) return null;

  return (
    <aside
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
    </aside>
  );
}
