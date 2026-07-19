/**
 * Markdown projections of the stories collection, for the agent-readable
 * endpoints the integration injects alongside the HTML pages:
 *
 *   - `scenarioToMarkdown` — the `<routeBase>/<slug>.md` twin of a story page,
 *     so every published scenario is consumable with curl / by an LLM without
 *     an HTML parser.
 *   - `storiesLlmsTxt` — the site's `/llms.txt`: an llms.txt-format index
 *     (H1, blockquote summary, one section per feature) linking each
 *     scenario's Markdown twin.
 *
 * The scenario body itself is rendered by the SHARED serializer in core — the
 * same one behind the HTML report's "Copy as Markdown" button — so the two
 * surfaces cannot drift. Only the metadata header is assembled here, because
 * the fields it shows (feature, source, commit, sample flag) live on the
 * collection entry rather than on the canonical scenario.
 */
import { scenarioToMarkdown as coreScenarioToMarkdown } from "executable-stories-core";

import { joinHref, normalizeBase } from "./sidebar-nav.js";
import type { StoryEntryData } from "./loader.js";

/** The metadata bullets shown under a story page's heading. */
function metaLines(story: StoryEntryData): string[] {
  const lines = [`- Status: ${story.status}${story.planned ? " (planned)" : ""}`];
  if (story.feature?.title) {
    lines.push(`- Feature: ${story.feature.title} (\`${story.feature.sourceFile}\`)`);
  }
  if (story.tags.length > 0) lines.push(`- Tags: ${story.tags.map((t) => `\`@${t}\``).join(", ")}`);
  lines.push(`- Duration: ${story.durationMs}ms`);
  if (story.run?.gitSha) lines.push(`- Commit: ${story.run.gitSha}`);
  if (story.sample) lines.push(`- Note: sample data — no real test run has been loaded yet`);
  return lines;
}

/**
 * The full Markdown twin of a story page: metadata header, Gherkin steps with
 * failure output, then every doc entry the test attached.
 */
export function scenarioToMarkdown(story: StoryEntryData): string {
  return coreScenarioToMarkdown(story, { variant: "full", meta: metaLines(story) });
}

/**
 * The site's `/llms.txt` (https://llmstxt.org format): summary counts up top,
 * one section per feature, each scenario linking its Markdown twin at
 * `<routeBase>/<slug>.md`.
 */
export function storiesLlmsTxt(stories: StoryEntryData[], options: { routeBase?: string } = {}): string {
  const base = normalizeBase(options.routeBase ?? "/stories");
  const counts = { passed: 0, failed: 0, skipped: 0, pending: 0 };
  for (const s of stories) counts[s.status] = (counts[s.status] ?? 0) + 1;
  const features = new Map<string, StoryEntryData[]>();
  for (const s of stories) {
    const key = s.feature?.title ?? "Stories";
    const list = features.get(key) ?? [];
    list.push(s);
    features.set(key, list);
  }
  const lines: string[] = [
    "# Stories",
    "",
    `> Living documentation generated from executable stories: ${stories.length} scenarios ` +
      `across ${features.size} features (${counts.passed} passed, ${counts.failed} failed, ` +
      `${counts.skipped} skipped, ${counts.pending} pending). Each link below is a ` +
      `plain-Markdown twin of the scenario's page.`,
    "",
  ];
  for (const [feature, list] of features) {
    lines.push(`## ${feature}`, "");
    for (const s of list) {
      lines.push(`- [${s.title}](${joinHref(base, `${s.slug}.md`)}): ${s.status}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}
