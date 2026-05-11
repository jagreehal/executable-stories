import type { ReportSummary as ReportSummaryT } from "executable-stories-formatters";
import { useReport } from "../hooks/useReport";

export interface ReportSummaryProps {
  className?: string;
}

export function ReportSummary({ className }: ReportSummaryProps) {
  const report = useReport();
  return (
    <ReportSummaryView
      summary={report.summary}
      {...(className !== undefined && { className })}
      ariaLabel="Run summary"
    />
  );
}

export interface ReportSummaryViewProps {
  summary: ReportSummaryT;
  className?: string;
  ariaLabel?: string;
}

export function ReportSummaryView({ summary, className, ariaLabel }: ReportSummaryViewProps) {
  return (
    <p
      className={["es-report-summary", className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
    >
      <span>
        <strong>{summary.total}</strong> scenario{summary.total === 1 ? "" : "s"}
      </span>
      {" · "}
      <span data-status="passed">{summary.passed} passed</span>
      {" · "}
      <span data-status="failed">{summary.failed} failed</span>
      {summary.skipped > 0 ? (
        <>
          {" · "}
          <span data-status="skipped">{summary.skipped} skipped</span>
        </>
      ) : null}
      {summary.pending > 0 ? (
        <>
          {" · "}
          <span data-status="pending">{summary.pending} pending</span>
        </>
      ) : null}
    </p>
  );
}
