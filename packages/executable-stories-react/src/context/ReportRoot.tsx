import { useMemo, type ReactNode } from "react";
import type { StoryReport } from "executable-stories-formatters";
import type { BuiltinRenderers, CustomRenderers } from "../renderers";
import { ReportContext, type ReportContextValue } from "./ReportContext";

export interface ReportRootProps {
  report: StoryReport;
  customRenderers?: CustomRenderers;
  renderers?: BuiltinRenderers;
  children: ReactNode;
}

const EMPTY_CUSTOM: CustomRenderers = {};
const EMPTY_RENDERERS: BuiltinRenderers = {};

export function ReportRoot({
  report,
  customRenderers,
  renderers,
  children,
}: ReportRootProps) {
  const value = useMemo<ReportContextValue>(
    () => ({
      report,
      customRenderers: customRenderers ?? EMPTY_CUSTOM,
      renderers: renderers ?? EMPTY_RENDERERS,
    }),
    [report, customRenderers, renderers],
  );
  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}
