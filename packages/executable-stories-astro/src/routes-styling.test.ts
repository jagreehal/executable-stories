import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * The injected route pages are standalone (not Starlight pages), so a consumer's
 * Starlight `customCss` never reaches them. They must ship their own default
 * stylesheet or they render completely unstyled out of the box. Lock that in.
 */
const pkgRoot = fileURLToPath(new URL("..", import.meta.url));
const ROUTES = ["routes/story.astro", "routes/stories.astro", "routes/explorer.astro"];

describe("injected routes ship default styling", () => {
  it("ships the default stylesheet", () => {
    expect(existsSync(`${pkgRoot}/styles/es.css`)).toBe(true);
  });

  for (const route of ROUTES) {
    it(`${route} imports the default stylesheet`, () => {
      const src = readFileSync(`${pkgRoot}/${route}`, "utf8");
      expect(src).toContain('import "../styles/es.css"');
    });
  }
});

/**
 * Drift guard. Scenario *content* (steps, status icons, doc entries, the error
 * box) is rendered by the React report components (`<ReportScenario/>` /
 * `<ReportInteractive/>`) and styled by their compiled, `.es-report-island`-
 * scoped stylesheet (executable-stories-react/tailwind.css) — the SAME visuals
 * the standalone single-file HTML report ships. es.css owns ONLY the site
 * chrome (index, explorer, health, page header) + the `.es-*` wrappers; it must
 * NEVER re-declare a content rule, or the two surfaces silently drift. The
 * forbidden names below are the string-renderer's content classes — the React
 * components don't emit them, so any es.css rule for them is dead drift.
 */
describe("es.css does not re-declare shared content styles", () => {
  // Strip CSS comments so a class named in a comment isn't mistaken for a rule.
  const css = readFileSync(`${pkgRoot}/styles/es.css`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  // Selectors whose visual definition lives in a shared, exported stylesheet.
  const FORBIDDEN = [
    "error-box",
    "attachments",
    "attachment-image",
    "attachment-unavailable",
    "step-status",
    "step-keyword",
    "step-text",
    "step-param",
    "step-duration",
    "status-passed",
    "status-failed",
    "status-skipped",
    "status-pending",
    "doc-note",
    "doc-tag",
    "doc-code",
    "doc-table",
    "doc-kv",
    "doc-section",
    "doc-mermaid",
    "doc-link",
    "doc-screenshot",
    "doc-custom",
  ];

  for (const name of FORBIDDEN) {
    it(`does not style .${name} (comes from the shared stylesheet)`, () => {
      // `.name …{` — the class heading a real rule (allows selector lists).
      const declared = new RegExp(`\\.${name}\\b[^{}]*\\{`).test(css);
      expect(declared).toBe(false);
    });
  }
});
