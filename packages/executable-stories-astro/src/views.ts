/**
 * Persona views — pure logic behind the `/for/*` audience lenses.
 *
 * A view is a filtered, re-grouped rendering of the SAME stories collection
 * the main index uses: no second spec layer, no extra test metadata beyond
 * the tags scenarios already carry. Resolution and report derivation live
 * here (no Astro imports) so they unit-test in isolation and the injected
 * route files stay thin shells.
 */
import { passesFilter, slugify, type ExecutableStoriesConfig, type PersonaView } from "./config.js";
import { groupScenarios } from "./grouping.js";
import type { StoryEntryData } from "./loader.js";
import { storyReportFromEntries } from "./story-report-from-entries.js";
import { normalizeBase } from "./sidebar-nav.js";
import { humanizeSlug, type StoryReport } from "executable-stories-core";

/** A {@link PersonaView} with base normalized and label/groupBy defaulted. */
export interface ResolvedPersonaView extends PersonaView {
  base: string;
  label: string;
}

/** Label from the last segment of a base ("/for/product" → "Product"). */
function labelFromBase(base: string): string {
  const seg = base.replace(/\/+$/, "").split("/").filter(Boolean).pop() ?? "View";
  return humanizeSlug(seg);
}

/**
 * The built-in routes that are ENABLED, with their normalized bases. Disabled
 * routes are omitted: with injectJourneys: false a view may legitimately mount
 * at /journeys, so a disabled route must not shadow-block the URL it no longer
 * owns. Shared by resolveViews (view-vs-route collisions) and
 * assertRouteBases (route-vs-route collisions).
 */
function enabledRouteBases(config: ExecutableStoriesConfig): Array<{ name: string; base: string }> {
  const bases: Array<{ name: string; base: string }> = [];
  if (config.injectStoryRoute ?? true) bases.push({ name: "routeBase", base: normalizeBase(config.routeBase ?? "/stories") });
  if (config.injectExplorer ?? true) bases.push({ name: "explorerBase", base: normalizeBase(config.explorerBase ?? "/explorer") });
  if (config.injectJourneys ?? true) bases.push({ name: "journeysBase", base: normalizeBase(config.journeysBase ?? "/journeys") });
  if (config.injectStates ?? true) bases.push({ name: "statesBase", base: normalizeBase(config.statesBase ?? "/states") });
  return bases;
}

/**
 * Fail fast when two ENABLED built-in routes normalize to the same base
 * (e.g. journeysBase: "/stories"): both would inject at one pattern and one
 * set of pages would be silently unreachable.
 */
export function assertRouteBases(config: ExecutableStoriesConfig): void {
  const seen = new Map<string, string>();
  for (const { name, base } of enabledRouteBases(config)) {
    const prior = seen.get(base);
    if (prior) {
      throw new Error(
        `executable-stories: ${name} "${base}" collides with ${prior} — give each enabled route its own base (or disable one).`,
      );
    }
    seen.set(base, name);
  }
}

/**
 * Normalise and validate `config.views`. Throws on a missing/duplicate base or
 * a collision with the stories/explorer routes — a silently shadowed route is
 * far harder to diagnose than a config error at startup.
 */
export function resolveViews(config: ExecutableStoriesConfig): ResolvedPersonaView[] {
  const seen = new Set<string>(enabledRouteBases(config).map((b) => b.base));
  return (config.views ?? []).map((view) => {
    if (!view.base || typeof view.base !== "string") {
      throw new Error('executable-stories: each entry in `views` needs a `base` (e.g. "/for/product").');
    }
    const base = normalizeBase(view.base);
    if (seen.has(base)) {
      throw new Error(
        `executable-stories: view base "${base}" collides with another view or the stories/explorer/journeys routes.`,
      );
    }
    seen.add(base);
    return { ...view, base, label: view.label ?? labelFromBase(base) };
  });
}

/**
 * The view a pathname addresses, or undefined. Matches on the pathname's tail
 * so a site-level Astro `base` prefix doesn't break resolution.
 */
export function matchView(pathname: string, views: ResolvedPersonaView[]): ResolvedPersonaView | undefined {
  const path = ("/" + pathname).replace(/\/+$/, "").replace(/^\/+/, "/");
  return views.find((v) => path === v.base || path.endsWith(v.base));
}

/**
 * Derive the view's report: filter the entries through the view's
 * include/exclude, group them (view `groupBy`, falling back to the site's),
 * and rebuild a StoryReport with one synthetic feature per group so the
 * interactive index renders group labels as section headings.
 *
 * Unlike nav/explorer tag grouping, a scenario lands in its FIRST matching
 * group only: this report renders full scenario cards, and duplicating a card
 * would duplicate its DOM ids (step anchors, collapse targets) on one page.
 */
export function viewReport(
  entries: StoryEntryData[],
  view: ResolvedPersonaView,
  siteGroupBy: ExecutableStoriesConfig["groupBy"],
): StoryReport {
  const filtered = entries.filter((e) => passesFilter(e, view));
  const groups = groupScenarios(filtered, view.groupBy ?? siteGroupBy ?? "feature");
  const placed = new Set<string>();
  const remapped: StoryEntryData[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      if (placed.has(item.entryId)) continue;
      placed.add(item.entryId);
      remapped.push({
        ...item,
        feature: { id: `view-${slugify(view.base)}-${group.key}`, title: group.label, sourceFile: "" },
      });
    }
  }
  return storyReportFromEntries(remapped);
}
