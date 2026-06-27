/**
 * Standalone hydration island. Bundled by tsup as a self-contained IIFE
 * (`dist/report-island.global.js`, React included) and inlined into the
 * CLI's `html-react` output. On load it reads the embedded StoryReport JSON
 * and renders <ReportInteractive> into the island root, upgrading the static
 * server-rendered markup with search / filters / keyboard / copy.
 *
 * Client-takeover (createRoot, not hydrateRoot): the static markup is the
 * no-JS fallback + first paint; React re-renders the interactive tree over it.
 * The two trees differ by design, so a full re-render is simpler and safer
 * than hydration.
 */

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { ReportInteractive } from "./interactive/ReportInteractive";
import { buildIslandRenderers } from "./interactive/island-renderers";
import { coerceStoryReport } from "./schema/coerce";

const ROOT_ID = "es-report-root";
const DATA_ID = "es-report-data";

export function mountReportIsland(): void {
  const mount = document.getElementById(ROOT_ID);
  const dataEl = document.getElementById(DATA_ID);
  if (!mount || !dataEl?.textContent) return;

  let json: unknown;
  try {
    json = JSON.parse(dataEl.textContent);
  } catch {
    return; // leave the static fallback in place
  }

  // The CLI/SSR pipeline already validated this report with the full Zod schema
  // before embedding it. The island only does cheap object + version checks to
  // keep zod (~315kb incl. locales) out of the inlined bundle. See coerce.ts.
  const result = coerceStoryReport(json);
  const title = mount.getAttribute("data-title") ?? undefined;

  // Highlighting + mermaid render INSIDE the React tree (not as scripts that
  // post-mutate island-owned DOM — the client takeover would clobber the
  // highlight spans and detach mermaid's SVG). The CLI signals which CDN
  // enhancements are enabled via data attributes, honouring
  // --html-no-syntax-highlighting / --html-no-mermaid.
  const renderers = buildIslandRenderers({
    syntaxHighlighting: mount.getAttribute("data-es-syntax") !== "false",
    mermaid: mount.getAttribute("data-es-mermaid") !== "false",
  });

  createRoot(mount).render(createElement(ReportInteractive, { report: result, title, renderers }));
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountReportIsland);
  } else {
    mountReportIsland();
  }
}
