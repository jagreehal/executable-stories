import type { ReportSummary as ReportSummaryT } from "executable-stories-core";
import { useReport } from "../hooks/useReport";
import { cn } from "@/lib/utils";

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
    <p className={cn("text-sm text-muted-foreground", className)} aria-label={ariaLabel}>
      <span>
        <strong className="font-semibold text-foreground">{summary.total}</strong> scenario
        {summary.total === 1 ? "" : "s"}
      </span>
      {" · "}
      <span data-status="passed" className="text-pass">{summary.passed} passed</span>
      {" · "}
      <span data-status="failed" className="text-fail">{summary.failed} failed</span>
      {summary.skipped > 0 ? (
        <>
          {" · "}
          <span data-status="skipped" className="text-skip">{summary.skipped} skipped</span>
        </>
      ) : null}
      {summary.pending > 0 ? (
        <>
          {" · "}
          <span data-status="pending" className="text-pend">{summary.pending} pending</span>
        </>
      ) : null}
    </p>
  );
}
