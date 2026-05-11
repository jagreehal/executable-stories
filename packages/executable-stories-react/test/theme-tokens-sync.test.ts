/**
 * Drift guard: the --es-* token block in src/styles.css must stay in lockstep
 * with ES_THEME_TOKENS_CSS exported from executable-stories-formatters.
 *
 * We normalize whitespace and compare token-name → token-value maps. A
 * mismatch fails the test and points at the diverging tokens.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ES_THEME_TOKENS_CSS } from "executable-stories-formatters";

type ScopeKey = "root" | "dark-media" | "dark-attr";

function extractTokensByScope(css: string): Record<ScopeKey, Record<string, string>> {
  const scopes: Record<ScopeKey, Record<string, string>> = {
    "root": {},
    "dark-media": {},
    "dark-attr": {},
  };

  // :root[, [data-theme="light"]] { ... }  → root scope
  const rootMatch = css.match(/:root[\s\S]*?\{([\s\S]*?)\}/);
  if (rootMatch && rootMatch[1]) scopes.root = parseDeclarations(rootMatch[1]);

  // @media (prefers-color-scheme: dark) { :root { ... } }
  const mediaMatch = css.match(/@media \(prefers-color-scheme: dark\)\s*\{[\s\S]*?:root\s*\{([\s\S]*?)\}/);
  if (mediaMatch && mediaMatch[1]) scopes["dark-media"] = parseDeclarations(mediaMatch[1]);

  // [data-theme="dark"] { ... }
  const darkAttrMatch = css.match(/\[data-theme="dark"\]\s*\{([\s\S]*?)\}/);
  if (darkAttrMatch && darkAttrMatch[1]) scopes["dark-attr"] = parseDeclarations(darkAttrMatch[1]);

  return scopes;
}

function parseDeclarations(block: string): Record<string, string> {
  const decls: Record<string, string> = {};
  for (const line of block.split(";")) {
    const m = line.match(/(--es-[A-Za-z0-9-]+)\s*:\s*([^;]+)/);
    if (m && m[1] && m[2] !== undefined) {
      decls[m[1]] = m[2].trim();
    }
  }
  return decls;
}

describe("--es-* token sync", () => {
  const reactCssPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../src/styles.css",
  );
  const reactCss = readFileSync(reactCssPath, "utf8");

  const fromReact = extractTokensByScope(reactCss);
  const fromFormatters = extractTokensByScope(ES_THEME_TOKENS_CSS);

  it("has the same :root tokens in both sources", () => {
    expect(fromReact.root).toEqual(fromFormatters.root);
  });

  it("has the same prefers-color-scheme: dark tokens in both sources", () => {
    expect(fromReact["dark-media"]).toEqual(fromFormatters["dark-media"]);
  });

  it("has the same [data-theme=\"dark\"] tokens in both sources", () => {
    expect(fromReact["dark-attr"]).toEqual(fromFormatters["dark-attr"]);
  });

  it("covers the load-bearing color tokens", () => {
    for (const key of [
      "--es-color-passed",
      "--es-color-failed",
      "--es-color-skipped",
      "--es-color-pending",
      "--es-color-bg",
      "--es-color-fg",
    ]) {
      expect(fromReact.root[key]).toBeTruthy();
      expect(fromFormatters.root[key]).toBeTruthy();
    }
  });
});
