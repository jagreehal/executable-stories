/**
 * Stories overview / landing page for the living-docs portal (`/stories/`).
 *
 * Renders an audience-first home: a card per audience (engineer = unit/integration,
 * stakeholder = e2e) with pass/fail counts, then each scenario as a deep link with
 * a status icon. Built entirely from the scenario-links index, which already carries
 * title, audience, status, and deepLink per scenario — so URLs match the real routes.
 *
 * Pure render — `build-docs` writes the file.
 */

import type { ScenarioLink, ScenarioLinksIndex } from "./scenario-links";
import type { ReviewAudience } from "./types/review";
import type { TestStatus } from "./types/story-report";

/** Audiences in display order, with a human label and icon for the card heading. */
const AUDIENCE_CARDS: Array<{ key: ReviewAudience; label: string; icon: string; blurb: string }> = [
  {
    key: "engineer",
    label: "Engineer",
    icon: "🔧",
    blurb: "Unit & integration behaviour — how the system works under the hood.",
  },
  {
    key: "stakeholder",
    label: "Stakeholder",
    icon: "🎬",
    blurb: "End-to-end journeys — what the product does, with video and traces.",
  },
];

const STATUS_ICON: Record<TestStatus, string> = {
  passed: "✅",
  failed: "❌",
  skipped: "⏭️",
  pending: "🚧",
};

function yamlScalar(value: string): string {
  if (/[:#[\]{}&*!|>'"%@`]|^[\s-]|\s$/.test(value)) {
    return `'${value.replace(/'/g, "''")}'`;
  }
  return value;
}

/** Render the `/stories/` overview page (frontmatter + body) as a Starlight markdown string. */
export function renderOverviewPage(links: ScenarioLinksIndex): string {
  const all = Object.values(links.scenarios);
  const total = all.length;
  const passed = all.filter((s) => s.status === "passed").length;
  const failed = all.filter((s) => s.status === "failed").length;

  const frontmatter = [
    "---",
    "title: Stories",
    `description: ${yamlScalar(
      `${total} scenario${total !== 1 ? "s" : ""} — ${passed} passed, ${failed} failed`,
    )}`,
    "sidebar:",
    "  order: 1",
    "---",
  ].join("\n");

  const body: string[] = [
    `**${total}** scenarios · **${passed}** passed · **${failed}** failed`,
    "",
  ];

  for (const card of AUDIENCE_CARDS) {
    const scenarios = all.filter((s) => s.audience === card.key);
    if (scenarios.length === 0) continue;
    const cardPassed = scenarios.filter((s) => s.status === "passed").length;
    const cardFailed = scenarios.filter((s) => s.status === "failed").length;
    const counts = cardFailed > 0 ? `${cardPassed} passed, ${cardFailed} failed` : `${cardPassed} passed`;

    body.push(`## ${card.icon} ${card.label} (${scenarios.length} — ${counts})`, "");
    body.push(`${card.blurb}`, "");
    for (const s of scenariosSorted(scenarios)) {
      body.push(`- ${STATUS_ICON[s.status] ?? "•"} [${s.title}](${s.deepLink})`);
    }
    body.push("");
  }

  return `${frontmatter}\n\n${body.join("\n")}\n`;
}

/** Failures first (most actionable), then alphabetical by title. */
function scenariosSorted(scenarios: ScenarioLink[]): ScenarioLink[] {
  return [...scenarios].sort((a, b) => {
    const aFail = a.status === "failed" ? 0 : 1;
    const bFail = b.status === "failed" ? 0 : 1;
    if (aFail !== bFail) return aFail - bFail;
    return a.title.localeCompare(b.title);
  });
}
