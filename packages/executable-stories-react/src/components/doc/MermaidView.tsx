"use client";

import { useEffect, useRef, useState } from "react";
import type { ReportDocMermaid } from "executable-stories-core";
import { MermaidSource } from "./DocMermaid";

export type MermaidApi = typeof import("mermaid").default;
export type MermaidLoader = () => Promise<MermaidApi>;

function prefersDark(el: HTMLElement | null): boolean {
  const themed = el?.closest<HTMLElement>("[data-theme]");
  if (themed?.dataset.theme === "dark") return true;
  if (themed?.dataset.theme === "light") return false;
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

/**
 * Presentational mermaid renderer with the loader INJECTED — it contains no
 * literal `import("mermaid")`, so a bundler following this module never pulls
 * mermaid in. `MermaidDiagram` wraps this with the installed-package loader;
 * the standalone report island wraps it with a CDN loader so the heavy library
 * never bloats the inlined island bundle.
 *
 * Draws the diagram to inline SVG (React-owned via state, so an island
 * re-render can't clobber it), redraws when the report's `data-theme` flips,
 * and falls back to `<MermaidSource>` (the readable, agent-friendly code) on
 * the server, before load, and on any error.
 */
export function MermaidView({ entry, load }: { entry: ReportDocMermaid; load: MermaidLoader }) {
  const ref = useRef<HTMLElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const draw = async () => {
      let mermaid: MermaidApi;
      try {
        mermaid = await load();
      } catch {
        // No library (offline, blocked CDN). Not the diagram's fault, so keep
        // the quiet source fallback rather than accusing the author.
        if (!cancelled) {
          setSvg(null);
          setError(null);
        }
        return;
      }
      try {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: prefersDark(ref.current) ? "dark" : "default",
        });
        // mermaid.parse is the library's own syntax check. Running it first
        // turns a broken diagram into a message naming the problem, and keeps
        // mermaid from injecting its own error graphic into the document.
        await mermaid.parse(entry.code);
        const id = `es-mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg: rendered } = await mermaid.render(id, entry.code);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSvg(null);
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };
    void draw();

    // Redraw when the report toggles theme on an ancestor.
    const themed = ref.current?.closest<HTMLElement>("[data-theme]");
    const observer = themed ? new MutationObserver(() => void draw()) : undefined;
    observer?.observe(themed!, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [entry.code, load]);

  if (svg) {
    return (
      <figure ref={ref} className="my-3">
        {entry.title ? (
          <figcaption className="mb-1.5 text-xs font-medium text-muted-foreground">{entry.title}</figcaption>
        ) : null}
        {/* role="img" presents the diagram as a single labelled graphic. */}
        <div
          role="img"
          aria-label={entry.title ?? "Mermaid diagram"}
          className="overflow-x-auto rounded-md border border-border bg-card p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </figure>
    );
  }

  // Pre-render / fallback: the readable source. The ref lets the effect locate
  // the themed ancestor from the same DOM position before the SVG swaps in.
  // A syntax error shows above it, because a diagram that silently degrades to
  // a code block is a diagram nobody ever fixes.
  return (
    <>
      {error ? (
        <p
          role="alert"
          data-es-mermaid-error
          className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          Diagram failed to render: {error}
        </p>
      ) : null}
      <MermaidSource entry={entry} ref={ref} />
    </>
  );
}
