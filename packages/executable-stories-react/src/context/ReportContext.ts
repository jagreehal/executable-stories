import { createContext } from "react";
import type { StoryReport } from "executable-stories-formatters";
import type { BuiltinRenderers, CustomRenderers } from "../renderers";

export interface ReportContextValue {
  report: StoryReport;
  customRenderers: CustomRenderers;
  renderers: BuiltinRenderers;
}

export const ReportContext = createContext<ReportContextValue | null>(null);
