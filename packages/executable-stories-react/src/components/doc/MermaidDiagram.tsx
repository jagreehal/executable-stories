"use client";

import type { ReportDocMermaid } from "executable-stories-core";
import { MermaidView, type MermaidApi, type MermaidLoader } from "./MermaidView";

export type { MermaidApi, MermaidLoader };

// Mermaid is heavy, so it's loaded only when a diagram actually renders (an
// optional peer dependency, dynamically imported) and cached for the page.
let mermaidLoader: Promise<MermaidApi> | undefined;
function loadMermaid(): Promise<MermaidApi> {
  // Intentional dynamic import: mermaid is an optional peer dep loaded on demand
  // so it never lands in the base bundle (see tsup external + peerDeps). This
  // literal lives ONLY here, not in MermaidView, so the standalone island —
  // which imports MermaidView with a CDN loader — never bundles mermaid.
  // eslint-disable-next-line no-restricted-syntax
  mermaidLoader ??= import("mermaid").then((m) => m.default);
  return mermaidLoader;
}

/**
 * Client renderer for `story.mermaid(...)` entries. Dynamically imports the
 * installed `mermaid` package and draws the diagram to inline SVG, falling back
 * to the readable source on the server / before load / on error.
 *
 * Opt in via `<Report renderers={{ mermaid: (e) => <MermaidDiagram entry={e} /> }} />`.
 * Requires `mermaid` to be installed (an optional peer dependency). Pass `load`
 * to override how mermaid is obtained (the standalone report island injects a
 * CDN loader via `MermaidView` directly).
 */
export function MermaidDiagram({ entry, load = loadMermaid }: { entry: ReportDocMermaid; load?: MermaidLoader }) {
  return <MermaidView entry={entry} load={load} />;
}
