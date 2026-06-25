import type { OtelSpan } from "executable-stories-core/types/otel";
import { formatDuration } from "executable-stories-core/utils/duration";
import { toTraceRows, traceWindow } from "@/lib/trace";
import { cn } from "@/lib/utils";

const BAR_COLOR: Record<string, string> = {
  ok: "bg-pass",
  error: "bg-fail",
  unset: "bg-skip",
};

/**
 * OTel trace waterfall. Collapsed by default (native <details>, no JS) so it
 * renders in both the static and interactive reports. Each span is a row with a
 * depth-indented name and a bar positioned/sized by its time window.
 */
export function ReportTrace({ spans }: { spans: readonly OtelSpan[] | undefined }) {
  if (!spans || spans.length === 0) return null;
  const rows = toTraceRows(spans);
  if (rows.length === 0) return null;
  const { minStartMs, totalMs } = traceWindow(rows);

  return (
    <details className="mt-3 rounded-md border border-border bg-muted/30">
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">
        Trace ({rows.length} span{rows.length === 1 ? "" : "s"}, {formatDuration(totalMs)})
      </summary>
      <ul className="flex flex-col gap-0.5 px-3 pb-3 font-mono text-[0.6875rem]">
        {rows.map((row, i) => {
          const leftPct = ((row.startTimeMs - minStartMs) / totalMs) * 100;
          const widthPct = Math.max((row.durationMs / totalMs) * 100, 0.5);
          return (
            <li key={`${row.spanId}-${i}`} className="flex items-center gap-2">
              <span
                className="min-w-0 flex-1 truncate text-foreground"
                style={{ paddingLeft: `${row.depth * 12}px` }}
                title={row.statusMessage ? `${row.name} — ${row.statusMessage}` : row.name}
              >
                {row.name}
              </span>
              <span className="relative h-3 w-1/2 shrink-0 overflow-hidden rounded-sm bg-border/40">
                <span
                  className={cn("absolute top-0 h-full rounded-sm", BAR_COLOR[row.status])}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                />
              </span>
              <span className="w-16 shrink-0 text-right text-muted-foreground">
                {formatDuration(row.durationMs)}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
