import type { ReactNode } from "react";
import type { ReportParseError } from "../result";
import { cn } from "../lib/utils";
import { ReportSummary } from "./ReportSummary";
import { ReportMeta } from "./ReportMeta";
import { ReportSchemaError } from "./ReportSchemaError";

/**
 * The report's title block — `<h1>` + summary + meta. Shared by the static
 * `Report` header and the interactive `ReportInteractive` header so the two
 * views can't drift on the no-JS fallback.
 */
export function ReportTitleBlock({ title }: { title?: string }) {
  return (
    <>
      <h1>{title ?? "Story Report"}</h1>
      <ReportSummary />
      <ReportMeta />
    </>
  );
}

/**
 * The `<main>` landmark shown when the report failed to parse. Both entrypoints
 * render the identical shell on a `Result` error, so it lives here once.
 */
export function ReportErrorShell({
  error,
  className,
  title,
  dataTheme,
}: {
  error: ReportParseError;
  className?: string;
  title?: string;
  dataTheme?: "light" | "dark";
}): ReactNode {
  return (
    <main className={cn("es-report", className)} aria-label={title ?? "Test report"} data-theme={dataTheme}>
      <ReportSchemaError error={error} />
    </main>
  );
}
