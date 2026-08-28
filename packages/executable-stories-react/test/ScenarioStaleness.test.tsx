import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScenarioStaleness } from "../src/components/ScenarioStaleness";
import { ScenarioFreshnessProvider } from "../src/interactive/scenario-freshness-context";

const DAY = 86_400_000;
const NOW = 1_700_000_000_000;

function withFreshness(
  scenario: { lastRunAtMs?: number },
  reportRanAtMs: number,
  staleAfterDays = 7,
) {
  return render(
    <ScenarioFreshnessProvider
      value={{
        staleAfterDays,
        report: { startedAtMs: reportRanAtMs, finishedAtMs: reportRanAtMs },
        nowMs: NOW,
      }}
    >
      <ScenarioStaleness scenario={scenario} />
    </ScenarioFreshnessProvider>,
  );
}

describe("<ScenarioStaleness>", () => {
  it("flags a scenario that has not run in longer than the threshold", () => {
    // The report itself was just rendered, so its own banner reads as fresh.
    // This scenario was carried over from a run twelve days ago.
    withFreshness({ lastRunAtMs: NOW - 12 * DAY }, NOW);

    const badge = screen.getByLabelText("Scenario freshness");
    expect(badge.textContent).toContain("12 days ago");
  });

  it("says nothing about a scenario that ran in this run", () => {
    withFreshness({ lastRunAtMs: NOW }, NOW);
    expect(screen.queryByLabelText("Scenario freshness")).toBeNull();
  });

  it("says nothing when the scenario has no stamp of its own", () => {
    // Reports produced before stamping, and single-run renders, must look
    // exactly as they did before.
    withFreshness({}, NOW - 12 * DAY);
    expect(screen.queryByLabelText("Scenario freshness")).toBeNull();
  });

  it("renders nothing outside a report that tracks freshness", () => {
    render(<ScenarioStaleness scenario={{ lastRunAtMs: NOW - 99 * DAY }} />);
    expect(screen.queryByLabelText("Scenario freshness")).toBeNull();
  });
});
