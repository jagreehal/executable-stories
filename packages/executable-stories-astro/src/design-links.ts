/**
 * Design context — pure logic behind the "Design" strip on story/journey pages.
 *
 * Scenarios already carry design references via the existing doc API:
 *
 *   story.link({ label: 'Figma — Checkout v3', url: 'https://figma.com/file/...' });
 *
 * Any `link` doc pointing at a design tool (Figma, Zeplin, Sketch, Abstract),
 * or whose label starts with "Design", is surfaced as a strip at the top of the
 * page — no new story API, no separate design-spec layer. Deduped by URL.
 */
import { safeUrl, type ReportDocEntry, type ReportScenario } from "executable-stories-core";

export interface DesignLink {
  label: string;
  url: string;
}

const DESIGN_HOST = /(^|\.)(figma\.com|zeplin\.io|sketch\.com|abstract\.com)$/i;
const DESIGN_LABEL = /^design\b/i;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** True when a link doc reads as a design reference (host or label convention). */
export function isDesignLink(label: string, url: string): boolean {
  return DESIGN_HOST.test(hostOf(url)) || DESIGN_LABEL.test(label);
}

function collect(entries: ReportDocEntry[], out: DesignLink[], seen: Set<string>): void {
  for (const entry of entries) {
    if (entry.kind === "link") {
      // Doc URLs are adapter-supplied and land in an href — same trust
      // boundary as every other report surface (rejects javascript: et al).
      const url = safeUrl(entry.url);
      if (url && isDesignLink(entry.label, url) && !seen.has(url)) {
        seen.add(url);
        out.push({ label: entry.label, url });
      }
    }
    if (entry.children) collect(entry.children, out, seen);
  }
}

/**
 * Every design link across the given scenarios (scenario-level docs plus
 * step-attached docs), first-seen order. Pass one scenario for a story page,
 * all members for a journey page.
 */
export function designLinks(
  scenarios: Array<Pick<ReportScenario, "docEntries" | "steps">>,
): DesignLink[] {
  const out: DesignLink[] = [];
  const seen = new Set<string>();
  for (const scenario of scenarios) {
    collect(scenario.docEntries, out, seen);
    for (const step of scenario.steps) collect(step.docEntries, out, seen);
  }
  return out;
}
