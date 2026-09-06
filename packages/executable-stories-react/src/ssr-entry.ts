/**
 * Server-only entry: render a StoryReport to a standalone HTML document string.
 *
 * This is the single rendering path shared by the CLI's standalone `.html`
 * output and (later) the Astro docs site — both render the same <Report/>
 * component tree, so there is no second renderer to drift from.
 *
 * No fs, no client code. The caller supplies the stylesheet text (read once
 * from `executable-stories-react/tailwind.css`) so this module stays pure and
 * bundler-agnostic. The interactive hydration island is injected via
 * `bodyExtra` in a later phase; this entry renders static markup only.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { StoryReport } from "executable-stories-core";
import type { Result } from "./result";
import { unwrapReport } from "./result";
import { Report } from "./components/Report";
import type { ScenarioHistoryMap, ScenarioRunEvent } from "./lib/run-history";

export type { ScenarioHistoryMap, ScenarioRunEvent };

export interface RenderReportToHtmlOptions {
  /** Document <title> and the report's <h1>. */
  title?: string;
  /** Stylesheet text inlined into <head> (e.g. executable-stories-react/tailwind.css). */
  css?: string;
  /** Force a theme; defaults to "light" (CSS still honours prefers-color-scheme). */
  theme?: "light" | "dark";
  /** Raw HTML injected at the end of <head> (font links, CDN module scripts). */
  headExtra?: string;
  /** Raw HTML injected before </body> (the hydration island <script>, later phases). */
  bodyExtra?: string;
  /** Document language attribute. */
  lang?: string;
  /** Load highlight.js to colour code blocks (default true). */
  syntaxHighlighting?: boolean;
  /** Load mermaid to render `pre[data-mermaid]` diagrams (default true). */
  mermaid?: boolean;
  /**
   * When set, embed the report JSON + this inlined IIFE bundle text
   * (executable-stories-react/report-island.js) so the static markup is
   * upgraded to the interactive tree on load. The static render stays as the
   * no-JS fallback.
   */
  islandScript?: string;
  /**
   * Days before the interactive report flags itself as stale ("Last verified
   * N days ago" warning banner). 0 disables the warning. Default 7.
   */
  staleAfterDays?: number;
  /**
   * Recent run events per scenario id (joined from the CLI's --history-file
   * store). Embedded as JSON next to the report data; the interactive island
   * renders a run-over-run timeline strip on each scenario card. Ignored for
   * static (non-island) output.
   */
  scenarioHistory?: ScenarioHistoryMap;
  /** Show the Share button in the interactive header (default false). `--html-share` turns it on. */
  share?: boolean;
  /** Command the share dialog hands over, e.g. `npx executable-stories share reports/`. */
  shareCommand?: string;
}

const ROOT_ID = "es-report-root";
const DATA_ID = "es-report-data";
const HISTORY_ID = "es-report-history";

/** Escape a JSON string for safe embedding inside a <script> element. */
function escapeJsonForScript(json: string): string {
  return json.replace(/[<\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

const HLJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/es/highlight.min.js";
const HLJS_CSS_LIGHT = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css";
const HLJS_CSS_DARK = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css";
const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";

/** Build the CDN <head> styles + the bottom-of-body init module script. */
function cdnAssets(syntaxHighlighting: boolean, mermaid: boolean): { head: string; body: string } {
  const headParts: string[] = [];
  const imports: string[] = [];
  const init: string[] = [];

  if (syntaxHighlighting) {
    headParts.push(`<link rel="stylesheet" href="${HLJS_CSS_LIGHT}">`);
    headParts.push(`<link rel="stylesheet" href="${HLJS_CSS_DARK}" media="(prefers-color-scheme: dark)">`);
    imports.push(`import hljs from "${HLJS_URL}";`);
    init.push("document.querySelectorAll('pre code').forEach((el) => hljs.highlightElement(el));");
  }
  if (mermaid) {
    imports.push(`import mermaid from "${MERMAID_URL}";`);
    init.push("mermaid.initialize({ startOnLoad: false, theme: 'neutral' });");
    init.push('await mermaid.run({ querySelector: "pre[data-mermaid]" });');
  }

  const body = imports.length
    ? `<script type="module">\n${imports.join("\n")}\n${init.join("\n")}\n</script>`
    : "";
  return { head: headParts.join("\n"), body };
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

/**
 * Render a StoryReport (or a parse Result) to a complete, self-contained HTML
 * document. The report markup is wrapped in `.es-report-island` so the scoped
 * Tailwind/shadcn resets and utilities apply without leaking onto a host page.
 */
export function renderReportToHtml(
  report: StoryReport | Result<StoryReport>,
  options: RenderReportToHtmlOptions = {},
): string {
  const {
    title = "Story Report",
    css = "",
    theme = "light",
    headExtra = "",
    bodyExtra = "",
    lang = "en",
    syntaxHighlighting = true,
    mermaid = true,
    islandScript = "",
    staleAfterDays = 7,
    scenarioHistory,
    share = false,
    shareCommand = "",
  } = options;

  const markup = renderToStaticMarkup(
    createElement(Report, { report, title }),
  );

  const cdn = cdnAssets(syntaxHighlighting, mermaid);

  // Interactive island: embed the report JSON + the inlined IIFE so the static
  // markup is upgraded to <ReportInteractive> on load (static = no-JS fallback).
  // <Report> already normalizes the same input internally; we re-normalize here
  // only to recover the bare report for the JSON payload.
  const parsed = unwrapReport(report);
  const rawReport: StoryReport | undefined = parsed.ok ? parsed.data : undefined;
  const interactive = islandScript.length > 0 && rawReport !== undefined;
  // Emitted whenever there is a report to emit, not only when the island will
  // hydrate. The JSON is already serialised, so it costs nothing, and it is the
  // difference between a JS-less report an agent can parse and one where the
  // only machine-readable copy of the run has been thrown away.
  const dataScript =
    rawReport !== undefined
      ? `<script type="application/json" id="${DATA_ID}">${escapeJsonForScript(JSON.stringify(rawReport))}</script>`
      : "";
  const historyScript =
    interactive && scenarioHistory && Object.keys(scenarioHistory).length > 0
      ? `<script type="application/json" id="${HISTORY_ID}">${escapeJsonForScript(JSON.stringify(scenarioHistory))}</script>`
      : "";
  const islandTag = interactive ? `<script>${islandScript}</script>` : "";
  // When interactive, the React island OWNS the doc-entry DOM via createRoot.
  // Highlighting + mermaid therefore render inside the React tree (the island
  // reads these flags and wires the matching renderers); the CDN post-processor
  // module (cdn.body) would race the client takeover and is dropped. The hljs
  // stylesheet (cdn.head) is still required to colour the React-owned tokens.
  const cdnBody = interactive ? "" : cdn.body;
  const shareAttrs = share
    ? ` data-es-share="true"${shareCommand ? ` data-es-share-cmd="${escapeHtml(shareCommand)}"` : ""}`
    : "";
  const islandConfigAttrs = interactive
    ? ` data-es-syntax="${syntaxHighlighting ? "true" : "false"}" data-es-mermaid="${mermaid ? "true" : "false"}" data-es-stale-days="${Number.isFinite(staleAfterDays) && staleAfterDays >= 0 ? staleAfterDays : 7}"${shareAttrs}`
    : "";
  const rootAttrs = interactive
    ? ` id="${ROOT_ID}" data-title="${escapeHtml(title)}"${islandConfigAttrs}`
    : "";

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}" data-theme="${theme === "dark" ? "dark" : "light"}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<title>${escapeHtml(title)}</title>
${cdn.head}
${headExtra}
<style>${css}</style>
</head>
<body>
<div${rootAttrs} class="es-report-island font-sans text-foreground">${markup}</div>
${dataScript}
${historyScript}
${bodyExtra}
${cdnBody}
${islandTag}
</body>
</html>`;
}
