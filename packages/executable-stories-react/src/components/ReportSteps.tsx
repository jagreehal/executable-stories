import type { ReportStep, ReportScenario } from "executable-stories-core";
import { formatDuration } from "executable-stories-core/utils/duration";
import { ReportDocEntries } from "./ReportDocEntries";
import { highlightStepParams } from "@/lib/step-params";
import { cn } from "@/lib/utils";

export interface ReportStepsProps {
  scenario: ReportScenario;
}

const STEP_GLYPH: Record<string, string> = {
  passed: "✓",
  failed: "✗",
  skipped: "○",
  pending: "○",
};

const STEP_GLYPH_COLOR: Record<string, string> = {
  passed: "text-pass",
  failed: "text-fail",
  skipped: "text-skip",
  pending: "text-pend",
};

export function ReportSteps({ scenario }: ReportStepsProps) {
  if (scenario.steps.length === 0) return null;
  return (
    <ol data-slot="steps" className="flex flex-col">
      {scenario.steps.map((step) => (
        <ReportStepItem key={step.id} step={step} />
      ))}
    </ol>
  );
}

export function ReportStepItem({ step }: { step: ReportStep }) {
  // And/But (incl. auto-And repeats) read as continuations of the prior step —
  // indented with a muted keyword, matching the report's `.step.continuation`.
  const kw = step.keyword.toLowerCase();
  const continuation = kw === "and" || kw === "but";
  return (
    <li
      id={step.id}
      data-status={step.status}
      className={cn("py-1.5 text-[0.8125rem] leading-normal", continuation && "pl-5")}
    >
      <div className="flex items-baseline gap-2">
        <span aria-hidden className={cn("w-4 shrink-0 text-center text-xs", STEP_GLYPH_COLOR[step.status])}>
          {STEP_GLYPH[step.status] ?? "○"}
        </span>
        <span
          className={cn(
            "min-w-[52px] shrink-0 font-mono text-xs font-semibold capitalize",
            continuation ? "font-medium text-muted-foreground" : "text-keyword",
          )}
        >
          {step.keyword}
        </span>
        <span className="flex-1 text-foreground">{highlightStepParams(step.text)}</span>
        {step.durationMs > 0 ? (
          <span className="shrink-0 whitespace-nowrap font-mono text-[0.6875rem] text-muted-foreground">
            {formatDuration(step.durationMs)}
          </span>
        ) : null}
      </div>
      {step.errorMessage ? (
        <pre
          role="alert"
          className="mt-2.5 ml-6 overflow-x-auto rounded-md border border-fail-border bg-fail-bg px-4 py-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap text-fail"
        >
          {step.errorMessage}
        </pre>
      ) : null}
      {step.docEntries.length > 0 ? (
        <div data-es-docs className="mt-2 ml-6">
          <ReportDocEntries entries={step.docEntries} />
        </div>
      ) : null}
    </li>
  );
}
