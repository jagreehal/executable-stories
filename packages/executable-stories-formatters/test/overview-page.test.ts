import { describe, it, expect } from "vitest";
import { renderOverviewPage } from "../src/overview-page";
import type { ScenarioNotesIndex } from "../src/notes-index";
import type { ScenarioLinksIndex, ScenarioLink } from "../src/scenario-links";

function link(partial: Partial<ScenarioLink> & Pick<ScenarioLink, "id" | "title" | "audience" | "status">): ScenarioLink {
  return {
    sourceFile: "x",
    url: `/stories/${partial.audience}/x/`,
    anchor: `scenario-${partial.id}`,
    deepLink: `/stories/${partial.audience}/x/#scenario-${partial.id}`,
    ...partial,
  };
}

function index(links: ScenarioLink[]): ScenarioLinksIndex {
  return {
    schemaVersion: "1.0",
    runId: "r",
    baseUrl: "/stories",
    scenarios: Object.fromEntries(links.map((l) => [l.id, l])),
  };
}

function notesIndex(notes: ScenarioNotesIndex["notes"]): ScenarioNotesIndex {
  return {
    schemaVersion: "1.0",
    notes,
  };
}

describe("renderOverviewPage", () => {
  it("renders audience cards with pass/fail counts and deep-linked scenarios", () => {
    const page = renderOverviewPage(
      index([
        link({ id: "e1", title: "Calculates total", audience: "engineer", status: "passed" }),
        link({ id: "e2", title: "Rejects token", audience: "engineer", status: "failed" }),
        link({ id: "s1", title: "Guest checkout", audience: "stakeholder", status: "passed" }),
      ]),
    );

    expect(page).toContain("title: Stories");
    expect(page).toContain("**3** scenarios · **2** passed · **1** failed");
    expect(page).toContain("## 🔧 Engineer (2 — 1 passed, 1 failed)");
    expect(page).toContain("## 🎬 Stakeholder (1 — 1 passed)");
    expect(page).toContain("[Guest checkout](/stories/stakeholder/x/#scenario-s1)");
  });

  it("puts failures first within an audience card", () => {
    const page = renderOverviewPage(
      index([
        link({ id: "e1", title: "Aaa passing", audience: "engineer", status: "passed" }),
        link({ id: "e2", title: "Zzz failing", audience: "engineer", status: "failed" }),
      ]),
    );
    expect(page.indexOf("Zzz failing")).toBeLessThan(page.indexOf("Aaa passing"));
    expect(page).toContain("- ❌ [Zzz failing]");
    expect(page).toContain("- ✅ [Aaa passing]");
  });

  it("omits an audience with no scenarios", () => {
    const page = renderOverviewPage(
      index([link({ id: "e1", title: "Only engineer", audience: "engineer", status: "passed" })]),
    );
    expect(page).toContain("## 🔧 Engineer");
    expect(page).not.toContain("Stakeholder");
  });

  it("links scenario notes beside scenarios when context exists", () => {
    const page = renderOverviewPage(
      index([link({ id: "s1", title: "Guest checkout", audience: "stakeholder", status: "passed" })]),
      notesIndex([
        {
          scenarioId: "s1",
          slug: "guest-checkout-context",
          title: "Guest checkout context",
        },
      ]),
    );

    expect(page).toContain("[Guest checkout](/stories/stakeholder/x/#scenario-s1) · [Business context →](/notes/guest-checkout-context/)");
  });
});
