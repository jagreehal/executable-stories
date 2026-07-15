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

/**
 * A single stat card. All cards share the neutral card surface; the status
 * *number* carries the colour (`--es-pass/fail/skip/pend`, mapped to Tailwind
 * in tailwind.css) and a matching leading dot. This drops the earlier pastel
 * fills for the flatter, dashboard-style KPI treatment — a mono micro-label
 * above an oversized tabular number.
 */
const TONE = {
  total: { num: "text-foreground", dot: "bg-muted-foreground/50" },
  passed: { num: "text-pass", dot: "bg-pass" },
  failed: { num: "text-fail", dot: "bg-fail" },
  skipped: { num: "text-skip", dot: "bg-skip" },
  pending: { num: "text-pend", dot: "bg-pend" },
} as const;

export function ReportSummaryView({ summary, className, ariaLabel }: ReportSummaryViewProps) {
  const cards: Array<{ status: keyof typeof TONE; label: string; value: number }> = [
    { status: "total", label: "Total", value: summary.total },
    { status: "passed", label: "Passed", value: summary.passed },
    { status: "failed", label: "Failed", value: summary.failed },
    { status: "skipped", label: "Skipped", value: summary.skipped },
  ];
  if (summary.pending > 0) {
    cards.push({ status: "pending", label: "Pending", value: summary.pending });
  }
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-3",
        // Columns follow the card count so the row is always full — 5 statuses
        // (pending present) never leave a lone orphan card below a row of four.
        cards.length === 5 ? "sm:grid-cols-5" : "sm:grid-cols-4",
        className,
      )}
      aria-label={ariaLabel}
    >
      {cards.map((c) => {
        const tone = TONE[c.status];
        return (
          <div
            key={c.status}
            data-status={c.status}
            className="rounded-lg border bg-card px-4 py-3"
          >
            <dt className="flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} aria-hidden="true" />
              {c.label}
            </dt>
            <dd className={cn("mt-2 text-3xl font-semibold leading-none tracking-tight tabular-nums", tone.num)}>
              {c.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
