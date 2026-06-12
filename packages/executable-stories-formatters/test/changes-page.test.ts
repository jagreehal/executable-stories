import { describe, it, expect } from "vitest";
import { renderChangesPage } from "../src/changes-page";
import type { BehaviorDiff } from "../src/behavior-diff";
import type { ScenarioLinksIndex } from "../src/scenario-links";

const links: ScenarioLinksIndex = {
  schemaVersion: "1.0",
  runId: "r",
  baseUrl: "/stories",
  scenarios: {
    "c--guest": {
      id: "c--guest",
      title: "Guest checkout",
      audience: "stakeholder",
      status: "failed",
      sourceFile: "e2e/checkout.story.spec.ts",
      url: "/stories/stakeholder/checkout/",
      anchor: "scenario-guest-checkout",
      deepLink: "/stories/stakeholder/checkout/#scenario-guest-checkout",
    },
  },
};

function diff(partial: Partial<BehaviorDiff["summary"]>, scenarios: BehaviorDiff["scenarios"]): BehaviorDiff {
  return {
    schemaVersion: "1.0",
    summary: { added: 0, removed: 0, regressed: 0, fixed: 0, changed: 0, unchanged: 0, ...partial },
    scenarios,
  };
}

describe("renderChangesPage", () => {
  it("renders a no-changes page when nothing moved", () => {
    const page = renderChangesPage(diff({ unchanged: 3 }, []), links);
    expect(page).toContain("title: What's changed");
    expect(page).toContain("variant: note");
    expect(page).toContain("No behavioural changes since the baseline");
    expect(page).not.toContain("##");
  });

  it("flags a danger badge and links regressed scenarios to their deep link", () => {
    const page = renderChangesPage(
      diff(
        { regressed: 1 },
        [
          {
            id: "c--guest",
            title: "Guest checkout",
            sourceFile: "e2e/checkout.story.spec.ts",
            kind: "regressed",
            baselineStatus: "passed",
            currentStatus: "failed",
          },
        ],
      ),
      links,
    );

    expect(page).toContain("variant: danger");
    expect(page).toContain("## ⚠️ Regressed (1)");
    expect(page).toContain("[Guest checkout](/stories/stakeholder/checkout/#scenario-guest-checkout)");
    expect(page).toContain("`passed` → `failed`");
  });

  it("lists removed scenarios without a link (their page is gone)", () => {
    const page = renderChangesPage(
      diff(
        { removed: 1 },
        [{ id: "gone--x", title: "Old behaviour", sourceFile: "tests/old.story.test.ts", kind: "removed" }],
      ),
      links,
    );
    expect(page).toContain("## 🗑️ Removed (1)");
    expect(page).toContain("- Old behaviour `tests/old.story.test.ts`");
    expect(page).not.toContain("[Old behaviour]");
  });
});
