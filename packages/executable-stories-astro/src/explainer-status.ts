/**
 * Explainer freshness for the docs site.
 *
 * Explainer documents (explain-change skill output) carry an `explainer`
 * frontmatter block citing scenarios by id + content hash. When the authored
 * docs loader is given the shared executable-stories config, it audits each
 * explainer against the current run and injects a status banner at the top of
 * the page: a fresh/stale badge plus deep links to the cited scenarios'
 * story pages.
 *
 * Only rendering/auditing happens here — generation of explainers is an
 * agent-side skill, never part of this pipeline.
 */
import * as fs from "node:fs";

// Import from the package's main entry (not the ./explainer subpath): the astro
// dts bundler inlines main-entry core types, so ExplainerScenarioCheck ends up
// in our published .d.ts instead of leaking an import of the unpublished core.
import {
  checkExplainerRef,
  explainerRefFromFrontmatter,
  type ExplainerScenarioCheck,
} from "executable-stories-core";

import type { ExecutableStoriesConfig } from "./config.js";
import { escapeHtml } from "./escape-html.js";
import { loadAllStoryEntries, type StoryEntryData } from "./loader.js";

/** One cited scenario's audit line, with its story-page href when it resolves. */
export type ExplainerScenarioLine = ExplainerScenarioCheck & { href?: string };

export interface ExplainerAudit {
  /** `fresh` only when every cited scenario checks out `ok`. */
  status: "fresh" | "stale";
  scenarios: ExplainerScenarioLine[];
}

/**
 * Load the story entries the audits check against, via
 * {@link loadAllStoryEntries} — the same code path the stories loader uses —
 * so ids, slugs, and multi-source semantics cannot drift from the story
 * routes. `sampleSource` never participates: auditing real explainers against
 * sample data would fabricate staleness.
 *
 * Returns undefined when no run JSON is readable yet (the banner is skipped
 * rather than rendered wrong). An empty-but-valid run still returns entries
 * (`[]`) so citations go `missing`: if every cited scenario was deleted, the
 * explainer must surface as stale.
 *
 * This reads and parses every configured run JSON — call it once per docs
 * pass and share the result across documents.
 */
export function loadAuditEntries(config: ExecutableStoriesConfig): StoryEntryData[] | undefined {
  const { entries, readableSources } = loadAllStoryEntries(config, (abs) => {
    try {
      return JSON.parse(fs.readFileSync(abs, "utf8"));
    } catch {
      return null; // not yet produced — the audit stays silent
    }
  });
  return readableSources === 0 ? undefined : entries;
}

/**
 * Audit one document's frontmatter against already-loaded entries. Returns
 * undefined when the frontmatter has no valid `explainer` block.
 */
export function auditExplainerAgainstEntries(
  frontmatter: Record<string, unknown>,
  entries: StoryEntryData[],
  routeBase?: string,
): ExplainerAudit | undefined {
  const ref = explainerRefFromFrontmatter(frontmatter.explainer);
  if (!ref) return undefined;

  const check = checkExplainerRef(ref, entries);
  const base = (routeBase ?? "/stories").replace(/\/+$/, "");
  const slugById = new Map(entries.map((entry) => [entry.id, entry.slug]));
  const scenarios = check.scenarios.map((s): ExplainerScenarioLine => {
    const slug = s.matchedId ? slugById.get(s.matchedId) : undefined;
    return slug ? { ...s, href: `${base}/${slug}/` } : s;
  });
  return { status: check.status, scenarios };
}

/**
 * Single-document convenience: load the run and audit one frontmatter block.
 * Batch callers (the authored docs loader) load entries once with
 * {@link loadAuditEntries} and audit each doc against them instead.
 */
export function auditExplainerFrontmatter(
  frontmatter: Record<string, unknown>,
  config: ExecutableStoriesConfig,
): ExplainerAudit | undefined {
  const entries = loadAuditEntries(config);
  if (!entries) return undefined;
  return auditExplainerAgainstEntries(frontmatter, entries, config.routeBase);
}

function scenarioLine(s: ExplainerScenarioLine): string {
  const title = escapeHtml(s.matchedTitle ?? s.ref.title ?? s.ref.id);
  const label = s.href ? `<a href="${escapeHtml(s.href)}">${title}</a>` : title;
  switch (s.status) {
    case "ok":
      return `<li>✓ ${label}</li>`;
    case "changed":
      return `<li>⚠ ${label} — <strong>behaviour changed</strong> since this explainer was written</li>`;
    case "renamed":
      return `<li>⚠ ${label} — renamed since this explainer was written (restamp the id)</li>`;
    case "missing":
      return `<li>✗ ${title} — <strong>no longer exists</strong> in the current run</li>`;
  }
}

/**
 * Self-contained HTML banner summarising an explainer's freshness. Colours
 * come from the site's `--es-*` theme tokens (with the default palette as
 * fallback), so themed sites (terminal/minimal/vibrant/custom) keep their
 * look; tints derive from the same token via color-mix.
 */
export function explainerBannerHtml(audit: ExplainerAudit, generated?: string): string {
  const fresh = audit.status === "fresh";
  const tone = fresh ? "var(--es-pass, #16a34a)" : "var(--es-warn, #d97706)";
  const badge = fresh
    ? "✓ Fresh — the behaviour this explains is unchanged"
    : "⚠ Stale — the behaviour this explains has moved on";
  const when = generated ? ` (written ${escapeHtml(generated)})` : "";
  return [
    `<aside class="es-explainer-status" data-status="${audit.status}" style="border: 1px solid color-mix(in srgb, ${tone} 50%, transparent); border-left-width: 4px; background: color-mix(in srgb, ${tone} 12%, transparent); border-radius: 6px; padding: 0.75rem 1rem; margin-bottom: 1.5rem;">`,
    `<p style="margin: 0 0 0.35rem 0;"><strong>${badge}</strong>${when}</p>`,
    `<ul style="margin: 0; padding-left: 1.25rem;">`,
    audit.scenarios.map((s) => scenarioLine(s)).join("\n"),
    `</ul>`,
    `</aside>`,
  ].join("\n");
}
