import type { StoryReport } from "executable-stories-formatters";
import type { Result } from "../result";
import type { BuiltinRenderers, CustomRenderers } from "../renderers";
import { ReportRoot } from "../context/ReportRoot";
import { ReportSummary } from "./ReportSummary";
import { ReportFeatureList } from "./ReportFeatureList";
import { ReportEmpty } from "./ReportEmpty";
import { ReportSchemaError } from "./ReportSchemaError";

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
}

function isResult(value: ReportProps["report"]): value is Result<StoryReport> {
  return typeof value === "object"
    && value !== null
    && "ok" in (value as object)
    && typeof (value as { ok: unknown }).ok === "boolean";
}

export function Report(props: ReportProps) {
  const { report, customRenderers, renderers, className, title, dataTheme } = props;
  if (isResult(report)) {
    if (!report.ok) {
      return (
        <main
          className={["es-report", className].filter(Boolean).join(" ")}
          aria-label={title ?? "Test report"}
          data-theme={dataTheme}
        >
          <ReportSchemaError error={report.error} />
        </main>
      );
    }
    return (
      <ReportView
        report={report.data}
        customRenderers={customRenderers}
        renderers={renderers}
        className={className}
        title={title}
        dataTheme={dataTheme}
      />
    );
  }
  return (
    <ReportView
      report={report}
      customRenderers={customRenderers}
      renderers={renderers}
      className={className}
      title={title}
      dataTheme={dataTheme}
    />
  );
}

interface ReportViewProps {
  report: StoryReport;
  customRenderers?: CustomRenderers;
  renderers?: BuiltinRenderers;
  className?: string;
  title?: string;
  dataTheme?: "light" | "dark";
}

function ReportView({
  report,
  customRenderers,
  renderers,
  className,
  title,
  dataTheme,
}: ReportViewProps) {
  const hasContent = report.features.length > 0;
  return (
    <ReportRoot report={report} customRenderers={customRenderers} renderers={renderers}>
      <main
        className={["es-report", className].filter(Boolean).join(" ")}
        aria-label={title ?? "Test report"}
        data-theme={dataTheme}
      >
        <header className="es-report-header">
          <h1>{title ?? "Story Report"}</h1>
          <ReportSummary />
        </header>
        {hasContent ? <ReportFeatureList /> : <ReportEmpty />}
      </main>
    </ReportRoot>
  );
}
