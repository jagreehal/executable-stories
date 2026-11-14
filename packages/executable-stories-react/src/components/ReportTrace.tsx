import type { OtelLog, OtelSpan, OtelSpanEvent } from "executable-stories-core/types/otel";
import type { ReportStep } from "executable-stories-core/types/story-report";
import { extractStoryboardFrames } from "executable-stories-core/storyboard";
import { formatDuration } from "executable-stories-core/utils/duration";
import { toTraceRows, traceWindow } from "@/lib/trace";
import { cn } from "@/lib/utils";

const BAR_COLOR: Record<string, string> = {
  ok: "bg-pass",
  error: "bg-fail",
  unset: "bg-skip",
};

const SEVERITY_COLOR: Record<string, string> = {
  ERROR: "text-fail",
  FATAL: "text-fail",
  WARN: "text-skip",
  WARNING: "text-skip",
};

/** One log line: severity, then the body. Indented to sit under its span. */
function LogLine({ log, depth }: { log: OtelLog; depth: number }) {
  const severity = log.severity?.toUpperCase();
  return (
    <li data-es-log className="flex gap-2 text-muted-foreground" style={{ paddingLeft: `${depth * 12 + 12}px` }}>
      {severity ? <span className={cn("shrink-0", SEVERITY_COLOR[severity])}>{severity}</span> : null}
      <span className="min-w-0 break-words whitespace-pre-wrap">{log.body}</span>
    </li>
  );
}

const text = (value: unknown) => (typeof value === "string" ? value : undefined);

/**
 * One span event: an exception reads as its type and message, with the stack a
 * click away; a console message as its level and text; anything else by name.
 */
function EventLine({ event, depth }: { event: OtelSpanEvent; depth: number }) {
  const attrs = event.attributes ?? {};
  const pad = { paddingLeft: `${depth * 12 + 12}px` };
  if (event.name === "exception") {
    const type = text(attrs["exception.type"]) ?? "Error";
    const message = text(attrs["exception.message"]);
    const stack = text(attrs["exception.stacktrace"]);
    return (
      <li data-es-span-event="exception" className="text-fail" style={pad}>
        <span className="break-words whitespace-pre-wrap">
          {type}
          {message ? `: ${message}` : ""}
        </span>
        {stack ? (
          <details className="mt-0.5">
            <summary className="cursor-pointer text-muted-foreground">stack</summary>
            <pre className="overflow-auto whitespace-pre text-muted-foreground">{stack}</pre>
          </details>
        ) : null}
      </li>
    );
  }
  const level = event.name.startsWith("console.") ? event.name.slice("console.".length).toUpperCase() : undefined;
  return (
    <li data-es-span-event={event.name} className="flex gap-2 text-muted-foreground" style={pad}>
      <span className={cn("shrink-0", level ? SEVERITY_COLOR[level] : undefined)}>{level ?? event.name}</span>
      <span className="min-w-0 break-words whitespace-pre-wrap">{text(attrs["console.message"]) ?? text(attrs.message) ?? ""}</span>
    </li>
  );
}

/** A step the waterfall can place: when it began, and its screenshot when it has one. */
interface StepMark {
  leftPct: number;
  label: string;
  screenshot?: { path: string; alt?: string };
}

/** Steps that began inside the trace's window, placed on its time axis. */
function stepMarks(steps: readonly ReportStep[] | undefined, minStartMs: number, totalMs: number): StepMark[] {
  if (!steps?.length) return [];
  const shots = new Map(extractStoryboardFrames({ steps: [...steps] }).map((f) => [f.stepIndex, f.screenshot]));
  return steps.flatMap((step, i) => {
    const at = step.startedAtMs;
    if (at === undefined || at < minStartMs || at > minStartMs + totalMs) return [];
    const screenshot = shots.get(i);
    return [
      {
        leftPct: ((at - minStartMs) / totalMs) * 100,
        label: `${step.keyword} ${step.text}`,
        ...(screenshot ? { screenshot } : {}),
      },
    ];
  });
}

/**
 * OTel trace waterfall. Collapsed by default (native <details>, no JS) so it
 * renders in both the static and interactive reports. Each span is a row with a
 * depth-indented name and a bar positioned/sized by its time window. Logs from
 * the same trace sit directly under the span that was active when they were
 * written, so "what did this span say" needs no second view; logs whose span is
 * not in the trace follow the last row. Span events (a recorded exception, a
 * console error) sit under their span the same way. When the scenario's steps
 * carry start times inside the trace, a lane above the spans marks where each
 * began, with its screenshot, and a faint line crosses every bar at that time:
 * "Then the total shows £40" sits over the request that produced it.
 */
export function ReportTrace({
  spans,
  logs,
  steps,
}: {
  spans: readonly OtelSpan[] | undefined;
  logs?: readonly OtelLog[] | undefined;
  steps?: readonly ReportStep[] | undefined;
}) {
  // Logs joined with --otel-logs show even when no span has the timing to be drawn.
  const rows = spans?.length ? toTraceRows(spans) : [];
  if (rows.length === 0 && !logs?.length) return null;
  const { minStartMs, totalMs } = traceWindow(rows);
  const bySpan = new Map<string, OtelLog[]>();
  const orphanLogs: OtelLog[] = [];
  const spanIds = new Set(rows.map((row) => row.spanId));
  for (const log of logs ?? []) {
    if (log.spanId && spanIds.has(log.spanId)) {
      const list = bySpan.get(log.spanId) ?? [];
      list.push(log);
      bySpan.set(log.spanId, list);
    } else {
      orphanLogs.push(log);
    }
  }
  const logCount = logs?.length ?? 0;
  const eventsBySpan = new Map((spans ?? []).map((span) => [span.spanId, span.events ?? []]));
  const exceptionCount = (spans ?? []).reduce(
    (n, span) => n + (span.events ?? []).filter((e) => e.name === "exception").length,
    0,
  );
  const marks = stepMarks(steps, minStartMs, totalMs);

  return (
    <details className="mt-3 rounded-md border border-border bg-muted/30">
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">
        Trace (
        {[
          rows.length > 0 ? `${rows.length} span${rows.length === 1 ? "" : "s"}` : "",
          exceptionCount > 0 ? `${exceptionCount} exception${exceptionCount === 1 ? "" : "s"}` : "",
          logCount > 0 ? `${logCount} log${logCount === 1 ? "" : "s"}` : "",
          rows.length > 0 ? formatDuration(totalMs) : "",
        ]
          .filter(Boolean)
          .join(", ")}
        )
      </summary>
      <ul className="flex flex-col gap-0.5 px-3 pb-3 font-mono text-[0.6875rem]">
        {marks.length > 0 ? (
          <li data-es-trace-steps className="mb-1 flex items-end gap-2">
            <span className="min-w-0 flex-1 text-muted-foreground">Steps</span>
            <span className="relative h-10 w-1/2 shrink-0">
              {marks.map((mark, j) => (
                <span
                  key={`step-${j}`}
                  title={mark.label}
                  className="absolute bottom-0 flex flex-col items-start"
                  style={{ left: `${Math.min(mark.leftPct, 92)}%` }}
                >
                  {mark.screenshot ? (
                    <img
                      src={mark.screenshot.path}
                      alt={mark.screenshot.alt ?? mark.label}
                      loading="lazy"
                      className="h-8 w-auto max-w-14 rounded-sm border border-border object-cover"
                    />
                  ) : (
                    <span className="text-muted-foreground">{mark.label.split(" ")[0]}</span>
                  )}
                  <span className="h-1.5 w-px bg-foreground/40" />
                </span>
              ))}
            </span>
            <span className="w-16 shrink-0" />
          </li>
        ) : null}
        {rows.map((row, i) => {
          const leftPct = ((row.startTimeMs - minStartMs) / totalMs) * 100;
          const widthPct = Math.max((row.durationMs / totalMs) * 100, 0.5);
          return [
            <li key={`${row.spanId}-${i}`} className="flex items-center gap-2">
              <span
                className="min-w-0 flex-1 truncate text-foreground"
                style={{ paddingLeft: `${row.depth * 12}px` }}
                title={row.statusMessage ? `${row.name}: ${row.statusMessage}` : row.name}
              >
                {row.name}
              </span>
              <span className="relative h-3 w-1/2 shrink-0 overflow-hidden rounded-sm bg-border/40">
                <span
                  className={cn("absolute top-0 h-full rounded-sm", BAR_COLOR[row.status])}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                />
                {marks.map((mark, j) => (
                  <span
                    key={`guide-${j}`}
                    aria-hidden
                    className="absolute top-0 h-full w-px bg-foreground/20"
                    style={{ left: `${mark.leftPct}%` }}
                  />
                ))}
              </span>
              <span className="w-16 shrink-0 text-right text-muted-foreground">
                {formatDuration(row.durationMs)}
              </span>
            </li>,
            ...(eventsBySpan.get(row.spanId) ?? []).map((event, j) => (
              <EventLine key={`${row.spanId}-${i}-event-${j}`} event={event} depth={row.depth} />
            )),
            ...(bySpan.get(row.spanId) ?? []).map((log, j) => (
              <LogLine key={`${row.spanId}-${i}-log-${j}`} log={log} depth={row.depth} />
            )),
          ];
        })}
        {orphanLogs.map((log, j) => (
          <LogLine key={`orphan-log-${j}`} log={log} depth={0} />
        ))}
      </ul>
    </details>
  );
}
