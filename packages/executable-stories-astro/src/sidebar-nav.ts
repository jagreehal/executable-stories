/**
 * Sidebar navigation building blocks — the feature → scenario nav tree derived
 * from the configured run JSON. Extracted from the integration entry so the
 * nav-manifest module (which fingerprints this exact tree to drive dev-server
 * restarts) can share it without an import cycle.
 */
import fs from "node:fs";
import path from "node:path";

import { canonicalizeRun, toStoryReport, type StoryReport } from "executable-stories-core";

import { expandSource } from "./loader.js";
import { resolveSources, passesFilter, type ExecutableStoriesConfig } from "./config.js";

/** Normalize a route base to a leading-slash, no-trailing-slash form ("/stories"). */
export function normalizeBase(base: string): string {
  const trimmed = `/${base}`.replace(/\/+/g, "/").replace(/\/$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/**
 * Join a route base and an optional segment into an href, collapsing duplicate
 * slashes. Without this a root-mounted base ("/") would produce "//" or
 * "//slug/"; with it `joinHref("/", "slug/")` is "/slug/" and `joinHref("/stories",
 * "slug/")` is "/stories/slug/".
 */
export function joinHref(base: string, segment = ""): string {
  return `${base}/${segment}`.replace(/\/{2,}/g, "/");
}

/** A Starlight sidebar entry (the shapes we emit; Starlight accepts more). */
/** An item inside a sidebar group: a link, a nested group, or an autogen dir. */
export type SidebarItem =
  | { label: string; link: string }
  | { label: string; collapsed?: boolean; items: SidebarItem[] }
  | { autogenerate: { directory: string } };

export type SidebarEntry =
  | { label: string; link: string }
  | { label: string; collapsed?: boolean; items: SidebarItem[] };

/**
 * Build the story report(s) from the configured run JSON at config-load time,
 * through the SAME `canonicalizeRun` → `toStoryReport` path the page's island
 * renders through — so scenario ids (and therefore the `#anchor` links) match
 * the rendered DOM exactly. Reads synchronously and swallows every error (a
 * missing or half-written run JSON must never break `astro.config` load); the
 * caller falls back to a plain link when this yields nothing.
 */
export function loadStoryReports(config: ExecutableStoriesConfig): StoryReport[] {
  let sources: ReturnType<typeof resolveSources>;
  try {
    sources = resolveSources(config);
  } catch {
    return [];
  }
  const reports: StoryReport[] = [];
  for (const src of sources) {
    // A source may name a directory of per-file reports. Reading that as one
    // JSON file threw, and the nav fell back to a bare link — which is what the
    // scaffold's own default source does.
    const resolved = path.resolve(src.source);
    const isDir = fs.existsSync(resolved) && fs.statSync(resolved).isDirectory();
    const inputType = src.inputType ?? (isDir ? "canonical" : "raw");
    const files = isDir
      ? expandSource(resolved)
      : fs.existsSync(resolved)
        ? [resolved]
        : config.sampleSource
          ? [path.resolve(config.sampleSource)]
          : [];

    for (const abs of files) {
    try {
      let text: string | undefined;
      if (fs.existsSync(abs)) {
        text = fs.readFileSync(abs, "utf8");
      }
      if (!text) continue;
      const json = JSON.parse(text);
      const canonical = inputType === "canonical" ? json : canonicalizeRun(json);
      reports.push(toStoryReport(canonical));
    } catch {
      // A malformed/partial run JSON for one source must not break site nav.
      continue;
    }
    }
  }
  return reports;
}

/**
 * Feature → scenario nav for the Starlight sidebar: one collapsed group per
 * feature, each scenario a deep link to `/stories#<scenario-id>`. Honours the
 * same include/exclude the page applies (`passesFilter`), so no link ever
 * points at a scenario the page hides.
 */
export function storyNavItems(config: ExecutableStoriesConfig): SidebarItem[] {
  const href = joinHref(normalizeBase(config.routeBase ?? "/stories"));
  const groups: SidebarItem[] = [];
  for (const report of loadStoryReports(config)) {
    for (const feature of report.features) {
      const scenarios = feature.scenarios.filter((s) =>
        passesFilter(
          {
            status: s.status,
            tags: s.tags ?? [],
            feature: { title: feature.title, sourceFile: feature.sourceFile },
          },
          config,
        ),
      );
      if (scenarios.length === 0) continue;
      groups.push({
        label: feature.title,
        collapsed: true,
        items: scenarios.map((s) => ({ label: s.title, link: `${href}#${s.id}` })),
      });
    }
  }
  return groups;
}
