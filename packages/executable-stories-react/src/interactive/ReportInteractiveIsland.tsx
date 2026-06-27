"use client";

import { useMemo } from "react";
import type { StoryReport } from "executable-stories-core";
import type { Result } from "../result";
import { ReportInteractive } from "./ReportInteractive";
import { buildIslandRenderers } from "./island-renderers";

export interface ReportInteractiveIslandProps {
  report: StoryReport | Result<StoryReport>;
  title?: string;
  className?: string;
  hideHeader?: boolean;
  /** Render code blocks with CDN highlight.js (default true). */
  syntaxHighlighting?: boolean;
  /** Render `story.mermaid(...)` blocks as CDN-loaded SVG diagrams (default true). */
  mermaid?: boolean;
}

/**
 * Self-contained interactive island for host frameworks that hydrate this as a
 * client island (e.g. Astro `<ReportInteractiveIsland client:load/>`).
 *
 * Frameworks like Astro serialize island props as JSON, so they CANNOT pass the
 * `renderers` functions to <ReportInteractive> directly — which is why a host
 * would otherwise fall back to a separate post-hydration script that mutates the
 * island's DOM (and gets clobbered when the island re-renders). This wrapper
 * builds the React-OWNED highlighting + mermaid renderers internally, so the
 * enhancements live inside the React tree and survive every re-render. The
 * heavy libraries load from a CDN at runtime, so the host bundle stays lean.
 */
export function ReportInteractiveIsland({
  report,
  title,
  className,
  hideHeader,
  syntaxHighlighting = true,
  mermaid = true,
}: ReportInteractiveIslandProps) {
  const renderers = useMemo(
    () => buildIslandRenderers({ syntaxHighlighting, mermaid }),
    [syntaxHighlighting, mermaid],
  );
  return (
    <ReportInteractive
      report={report}
      title={title}
      className={className}
      hideHeader={hideHeader}
      renderers={renderers}
    />
  );
}
