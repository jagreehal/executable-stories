import type { StoryReport } from "executable-stories-core";
import type { Result } from "../result";
import { unwrapReport } from "../result";
import type { BuiltinRenderers, CustomRenderers } from "../renderers";
import { ReportRoot } from "../context/ReportRoot";
import { ReportFeatureList } from "./ReportFeatureList";
import { ReportEmpty } from "./ReportEmpty";
import { ReportTitleBlock, ReportErrorShell } from "./ReportShell";
import { ReportSpanGraph } from "./ReportSpanGraph";
import { cn } from "../lib/utils";

export interface ReportProps {
  /** A StoryReport, or a Result-wrapped one (e.g., from parseStoryReport). */
  report: StoryReport | Result<StoryReport>;
  /** Renderers keyed by `story.custom({ type })` strings. */
  customRenderers?: CustomRenderers;
  /** Optional overrides for the heavy built-ins (mermaid, code, section). */
  renderers?: BuiltinRenderers;
  /** Optional class on the <main> landmark for layout positioning. */
  className?: string;
  /** Optional override title. */
  title?: string;
  /** Optional theme attribute scope. Use to force "light" or "dark". */
  dataTheme?: "light" | "dark";
  /**
   * Draw the "Architecture, as it ran" section above the features. Off by
   * default — only an instrumented run has anything to draw, and the span
   * picture is a specialist view. `--html-architecture` turns it on.
   */
  architecture?: boolean;
}

export function Report(props: ReportProps) {
  const { report, customRenderers, renderers, className, title, dataTheme, architecture = false } = props;
  const result = unwrapReport(report);
  if (!result.ok) {
    return <ReportErrorShell error={result.error} className={className} title={title} dataTheme={dataTheme} />;
  }
  const data = result.data;
  const hasContent = data.features.length > 0;
  return (
    <ReportRoot report={data} customRenderers={customRenderers} renderers={renderers}>
      <main className={cn("es-report", className)} aria-label={title ?? "Test report"} data-theme={dataTheme}>
        <header className="es-report-header">
          <ReportTitleBlock title={title} />
        </header>
        {/* Run-level, so it sits above the features rather than inside one.
            Renders nothing unless the run carried spans. Mirrored in
            ReportInteractive — the two headers are composed separately, and
            both stories assert the section appears when asked for. */}
        {architecture ? <ReportSpanGraph /> : null}
        {hasContent ? <ReportFeatureList /> : <ReportEmpty />}
      </main>
    </ReportRoot>
  );
}
