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
import type { ScenarioHistoryMap } from "./lib/run-history";

const ROOT_ID = "es-report-root";
const DATA_ID = "es-report-data";
const HISTORY_ID = "es-report-history";

/** Cheap shape check for the embedded history JSON (written by our own SSR). */
function readScenarioHistory(): ScenarioHistoryMap | undefined {
  const el = document.getElementById(HISTORY_ID);
  if (!el?.textContent) return undefined;
  try {
    const parsed: unknown = JSON.parse(el.textContent);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined;
    return parsed as ScenarioHistoryMap;
  } catch {
    return undefined;
  }
}

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

  // The command the dialog hands over is stamped by the CLI, so it names the
  // report directory this report was actually written to.
  const share = mount.getAttribute("data-es-share") === "true";
  const shareCommand = mount.getAttribute("data-es-share-cmd") ?? undefined;

  // Staleness threshold set by the CLI (--html-stale-after-days); 0 disables,
  // absent attribute means the default (7).
  const staleDaysAttr = mount.getAttribute("data-es-stale-days");
  const staleDaysRaw = staleDaysAttr === null ? Number.NaN : Number(staleDaysAttr);
  const staleAfterDays = Number.isFinite(staleDaysRaw) && staleDaysRaw >= 0 ? staleDaysRaw : 7;

  createRoot(mount).render(
    createElement(ReportInteractive, {
      report: result,
      title,
      renderers,
      staleAfterDays,
      scenarioHistory: readScenarioHistory(),
      share,
      shareCommand,
    }),
  );
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountReportIsland);
  } else {
    mountReportIsland();
  }
}
