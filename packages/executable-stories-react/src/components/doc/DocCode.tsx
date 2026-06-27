import type { ReactNode } from "react";
import type { ReportDocCode } from "executable-stories-core";
import { useBuiltinRenderers } from "../../hooks/useRenderers";
import { cn } from "@/lib/utils";

/**
 * Shared shell for code blocks: optional label + the scrollable `<pre>`. Both
 * the static `DocCode` and the island's CDN-highlighted variant render their
 * `<code>` into this so the two can never drift in spacing or chrome.
 */
export function CodeFigure({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <figure className="my-3">
      {label ? (
        <figcaption className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</figcaption>
      ) : null}
      <pre tabIndex={0} className="overflow-x-auto rounded-md bg-muted p-3">
        {children}
      </pre>
    </figure>
  );
}

export function DocCode({ entry }: { entry: ReportDocCode }) {
  const renderers = useBuiltinRenderers();
  if (renderers.code) {
    return <>{renderers.code(entry)}</>;
  }
  return (
    <CodeFigure label={entry.label}>
      <code className={cn("font-mono text-xs", entry.lang && `language-${entry.lang}`)}>
        {entry.content}
      </code>
    </CodeFigure>
  );
}
