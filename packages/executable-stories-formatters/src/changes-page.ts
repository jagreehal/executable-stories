/**
 * "What's changed" page for the living-docs portal.
 *
 * Turns a `BehaviorDiff` (scenario-level status transitions vs a baseline run)
 * into a Starlight markdown page so the portal reads as living, not a snapshot.
 * Each surviving scenario links to its deep link from the scenario-links index;
 * removed scenarios have no current page, so they're listed by title/source only.
 *
 * Pure render — `build-docs` owns reading the baseline and writing the file.
 */

import type { BehaviorDiff, BehaviorDiffEntry } from "./behavior-diff";
import type { ScenarioLinksIndex } from "./scenario-links";

/** A change group, in the order it appears on the page (most urgent first). */
const GROUPS: Array<{ kind: BehaviorDiffEntry["kind"]; heading: string; icon: string }> = [
  { kind: "regressed", heading: "Regressed", icon: "⚠️" },
  { kind: "removed", heading: "Removed", icon: "🗑️" },
  { kind: "added", heading: "Added", icon: "✨" },
  { kind: "fixed", heading: "Fixed", icon: "✅" },
  { kind: "changed", heading: "Changed", icon: "🔁" },
];

function yamlScalar(value: string): string {
  if (/[:#[\]{}&*!|>'"%@`]|^[\s-]|\s$/.test(value)) {
    return `'${value.replace(/'/g, "''")}'`;
  }
  return value;
}

/** Sidebar badge reflecting the most urgent change present. */
function badge(summary: BehaviorDiff["summary"]): { text: string; variant: string } {
  if (summary.regressed > 0 || summary.removed > 0) return { text: "Regressed", variant: "danger" };
  if (summary.added > 0 || summary.fixed > 0 || summary.changed > 0)
    return { text: "Updated", variant: "tip" };
  return { text: "No changes", variant: "note" };
}

function line(entry: BehaviorDiffEntry, links: ScenarioLinksIndex): string {
  const link = links.scenarios[entry.id];
  const label = link ? `[${entry.title}](${link.deepLink})` : entry.title;
  const transition =
    entry.baselineStatus && entry.currentStatus && entry.baselineStatus !== entry.currentStatus
      ? ` — \`${entry.baselineStatus}\` → \`${entry.currentStatus}\``
      : "";
  return `- ${label} \`${entry.sourceFile}\`${transition}`;
}

/** Render the what's-changed page (frontmatter + body) as a Starlight markdown string. */
export function renderChangesPage(diff: BehaviorDiff, links: ScenarioLinksIndex): string {
  const b = badge(diff.summary);
  const { added, removed, regressed, fixed, changed } = diff.summary;
  const totalChanged = added + removed + regressed + fixed + changed;

  const frontmatter = [
    "---",
    "title: What's changed",
    `description: ${yamlScalar(
      totalChanged === 0
        ? "No behavioural changes since the baseline"
        : `${totalChanged} scenario${totalChanged !== 1 ? "s" : ""} changed since the baseline`,
    )}`,
    "sidebar:",
    "  order: 0",
    "  badge:",
    `    text: ${b.text}`,
    `    variant: ${b.variant}`,
    "---",
  ].join("\n");

  const body: string[] = [];
  if (totalChanged === 0) {
    body.push("No behavioural changes since the baseline run. ✅");
  } else {
    body.push(
      `**${regressed}** regressed · **${removed}** removed · **${added}** added · ` +
        `**${fixed}** fixed · **${changed}** changed`,
      "",
    );
    for (const group of GROUPS) {
      const entries = diff.scenarios.filter((s) => s.kind === group.kind);
      if (entries.length === 0) continue;
      body.push(`## ${group.icon} ${group.heading} (${entries.length})`, "");
      for (const entry of entries) body.push(line(entry, links));
      body.push("");
    }
  }

  return `${frontmatter}\n\n${body.join("\n")}\n`;
}
