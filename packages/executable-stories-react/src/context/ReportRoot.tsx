import { useMemo, type ReactNode } from "react";
import type { StoryReport } from "executable-stories-core";
import type { BuiltinRenderers, CustomRenderers } from "../renderers";
import { ReportContext, type ReportContextValue } from "./ReportContext";
import { narrativeBlockRenderers } from "../components/doc/NarrativeBlocks";

export interface ReportRootProps {
  report: StoryReport;
  customRenderers?: CustomRenderers;
  renderers?: BuiltinRenderers;
  children: ReactNode;
}

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
      // Narrative blocks render everywhere the report does (static SSR, the
      // island, Astro) without every host wiring them up. A host renderer for
      // the same type still wins.
      customRenderers: { ...narrativeBlockRenderers, ...customRenderers },
      renderers: renderers ?? EMPTY_RENDERERS,
    }),
    [report, customRenderers, renderers],
  );
  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}
