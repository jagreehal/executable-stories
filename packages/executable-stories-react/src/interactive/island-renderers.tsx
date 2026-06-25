"use client";

/**
 * Built-in renderer overrides for the standalone report island.
 *
 * The static HTML emits readable `<pre data-mermaid>` / `<pre><code>` fallbacks.
 * When the interactive island takes over (createRoot), it OWNS that DOM and will
 * clobber any externally-applied highlight spans / detach mermaid's injected SVG
 * on its next render. So highlighting + mermaid must live INSIDE the React tree
 * (rendered into state, owned by React) rather than as post-processing scripts
 * mutating island-managed nodes. These renderers do exactly that, loading the
 * heavy libraries from a CDN at runtime so they never bloat the inlined island.
 */

import { createElement, useEffect, useState } from "react";
import type { ReportDocCode } from "executable-stories-core";
import { MermaidView, type MermaidApi } from "../components/doc/MermaidView";
import { CodeFigure } from "../components/doc/DocCode";
import type { BuiltinRenderers } from "../renderers";
import { cn } from "../lib/utils";

// CDN URLs mirror ssr-entry's cdnAssets so the standalone report stays
// version-pinned and works offline-degraded (falls back to the readable source).
const HLJS_ESM = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/es/highlight.min.js";
const MERMAID_ESM = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";

/**
 * Import a module from a CDN URL once, caching the promise. The URL is passed as
 * a variable so it stays opaque to the bundler — the heavy library is loaded at
 * runtime, never inlined into the island. `default ?? namespace` tolerates both
 * default and namespace CDN builds.
 */
function cachedCdnModule<T>(url: string): () => Promise<T> {
  let loader: Promise<T> | undefined;
  return () => {
    // Intentional runtime dynamic import of a CDN URL (not bundled into the island).
    // eslint-disable-next-line no-restricted-syntax
    loader ??= import(/* @vite-ignore */ /* webpackIgnore: true */ url).then((m) => (m.default ?? m) as T);
    return loader;
  };
}

const loadMermaidFromCdn = cachedCdnModule<MermaidApi>(MERMAID_ESM);

interface Hljs {
  highlight(code: string, opts: { language: string; ignoreIllegals?: boolean }): { value: string };
  highlightAuto(code: string): { value: string };
  getLanguage(name: string): unknown;
}
const loadHljs = cachedCdnModule<Hljs>(HLJS_ESM);

/**
 * Code block whose syntax highlighting is produced by highlight.js loaded from
 * the CDN, rendered into React-owned markup via state. Falls back to the plain
 * (escaped) source before load and on any failure.
 */
function CdnHighlightedCode({ entry }: { entry: ReportDocCode }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const hljs = await loadHljs();
        const lang = entry.lang && hljs.getLanguage(entry.lang) ? entry.lang : undefined;
        const result = lang
          ? hljs.highlight(entry.content, { language: lang, ignoreIllegals: true })
          : hljs.highlightAuto(entry.content);
        if (!cancelled) setHtml(result.value);
      } catch {
        if (!cancelled) setHtml(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entry.content, entry.lang]);

  return (
    <CodeFigure label={entry.label}>
      {html !== null ? (
        <code
          className={cn("hljs font-mono text-xs", entry.lang && `language-${entry.lang}`)}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <code className={cn("font-mono text-xs", entry.lang && `language-${entry.lang}`)}>{entry.content}</code>
      )}
    </CodeFigure>
  );
}

export interface IslandRendererOptions {
  syntaxHighlighting: boolean;
  mermaid: boolean;
}

/**
 * Build the BuiltinRenderers map the island passes to <ReportInteractive>.
 * Created once at mount so the renderer functions stay referentially stable.
 */
export function buildIslandRenderers(opts: IslandRendererOptions): BuiltinRenderers {
  const renderers: BuiltinRenderers = {};
  if (opts.mermaid) {
    renderers.mermaid = (entry) => createElement(MermaidView, { entry, load: loadMermaidFromCdn });
  }
  if (opts.syntaxHighlighting) {
    renderers.code = (entry) => createElement(CdnHighlightedCode, { entry });
  }
  return renderers;
}
