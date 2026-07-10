import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  currentStreak,
  describeRunHistory,
  diffSinceLastRun,
  flakinessOf,
  type ScenarioRunEvent,
} from "../src/lib/run-history";
import { ReportInteractive } from "../src/interactive/ReportInteractive";
import { Report } from "../src/components/Report";
import { renderReportToHtml } from "../src/ssr-entry";
import { passingReport } from "./fixtures/sample-report";

function events(...statuses: Array<ScenarioRunEvent["status"]>): ScenarioRunEvent[] {
  return statuses.map((status, i) => ({ timestamp: 1_700_000_000_000 + i * 1000, status }));
}

describe("run-history helpers", () => {
  it("currentStreak counts trailing same-status runs", () => {
    expect(currentStreak(events("failed", "passed", "passed"))).toEqual({ status: "passed", count: 2 });
    expect(currentStreak(events("passed", "failed"))).toEqual({ status: "failed", count: 1 });
    expect(currentStreak([])).toBeUndefined();
  });

  it("describeRunHistory summarizes pass count and streak", () => {
    expect(describeRunHistory(events("failed", "passed", "passed"))).toBe(
      "2/3 runs passed · Passing for the last 2 runs",
    );
    expect(describeRunHistory(events("passed"))).toBe("1/1 runs passed");
  });

  it("flakinessOf classifies alternating statuses as flaky", () => {
    expect(flakinessOf(events("passed", "failed", "passed", "failed"))).toBe("flaky");
    expect(flakinessOf(events("passed", "passed", "passed", "passed"))).toBe("stable");
    // Below the sample floor everything is stable, even a flip.
    expect(flakinessOf(events("passed", "failed"))).toBe("stable");
    // Skipped runs don't count as transitions.
    expect(flakinessOf(events("passed", "skipped", "passed", "passed"))).toBe("stable");
  });

  it("flakinessOf classifies a persistent-but-settled failure as unstable, not flaky", () => {
    expect(flakinessOf(events("passed", "passed", "failed", "failed", "failed"))).toBe("unstable");
  });
});

describe("diffSinceLastRun", () => {
  const refs = [
    { id: "a", title: "Scenario A" },
    { id: "b", title: "Scenario B" },
    { id: "c", title: "Scenario C" },
  ];

  it("classifies newly failing, fixed, and first-seen scenarios", () => {
    const delta = diffSinceLastRun(
      {
        a: events("passed", "failed"),
        b: events("failed", "passed"),
        c: events("passed"),
      },
      refs,
    );
    expect(delta).toEqual({
      newlyFailing: [{ id: "a", title: "Scenario A" }],
      newlyPassing: [{ id: "b", title: "Scenario B" }],
      added: [{ id: "c", title: "Scenario C" }],
    });
  });

  it("returns undefined when no scenario has a previous run", () => {
    expect(diffSinceLastRun({ a: events("passed") }, refs)).toBeUndefined();
    expect(diffSinceLastRun({}, refs)).toBeUndefined();
  });

  it("treats skipped-to-failed as newly failing but failed-to-failed as unchanged", () => {
    const delta = diffSinceLastRun(
      { a: events("skipped", "failed"), b: events("failed", "failed") },
      refs,
    );
    expect(delta?.newlyFailing).toEqual([{ id: "a", title: "Scenario A" }]);
    expect(delta?.newlyPassing).toEqual([]);
  });
});

const SCENARIO_ID = "feature-todos--add-a-todo";

describe("<ScenarioRunHistory> via ReportInteractive", () => {
  it("renders a dot strip with an accessible summary when history is provided", () => {
    render(
      <ReportInteractive
        report={passingReport}
        scenarioHistory={{ [SCENARIO_ID]: events("failed", "passed", "passed") }}
      />,
    );
    const strip = screen.getByRole("img", { name: /Run history: 2\/3 runs passed/ });
    expect(strip.querySelectorAll("span[aria-hidden]")).toHaveLength(3);
  });

  it("shows nothing with fewer than two runs (no timeline yet)", () => {
    render(
      <ReportInteractive report={passingReport} scenarioHistory={{ [SCENARIO_ID]: events("passed") }} />,
    );
    expect(screen.queryByRole("img", { name: /Run history/ })).not.toBeInTheDocument();
  });

  it("shows nothing in the static report (history is interactive-only)", () => {
    render(<Report report={passingReport} />);
    expect(screen.queryByRole("img", { name: /Run history/ })).not.toBeInTheDocument();
  });
});

describe("flaky badge via ReportInteractive", () => {
  it("shows a Flaky badge when recent runs flip status", () => {
    render(
      <ReportInteractive
        report={passingReport}
        scenarioHistory={{ [SCENARIO_ID]: events("passed", "failed", "passed", "failed") }}
      />,
    );
    expect(screen.getByText("Flaky")).toBeInTheDocument();
  });

  it("shows no Flaky badge for a stable scenario", () => {
    render(
      <ReportInteractive
        report={passingReport}
        scenarioHistory={{ [SCENARIO_ID]: events("passed", "passed", "passed", "passed") }}
      />,
    );
    expect(screen.queryByText("Flaky")).not.toBeInTheDocument();
  });
});

describe("<ReportLastRunDelta> via ReportInteractive", () => {
  it("summarizes newly failing scenarios with deep links", () => {
    render(
      <ReportInteractive
        report={passingReport}
        scenarioHistory={{ [SCENARIO_ID]: events("passed", "failed") }}
      />,
    );
    const strip = screen.getByTestId("es-last-run-delta");
    expect(strip).toHaveTextContent("Since last run:");
    expect(strip).toHaveTextContent("1 newly failing");
    const link = strip.querySelector("a");
    expect(link).toHaveAttribute("href", `#${SCENARIO_ID}`);
  });

  it("reports no behavior changes when statuses are unchanged", () => {
    render(
      <ReportInteractive
        report={passingReport}
        scenarioHistory={{ [SCENARIO_ID]: events("passed", "passed") }}
      />,
    );
    expect(screen.getByTestId("es-last-run-delta")).toHaveTextContent("no behavior changes");
  });

  it("renders nothing without a previous run to compare", () => {
    render(
      <ReportInteractive report={passingReport} scenarioHistory={{ [SCENARIO_ID]: events("passed") }} />,
    );
    expect(screen.queryByTestId("es-last-run-delta")).not.toBeInTheDocument();
  });

  it("renders nothing without history at all", () => {
    render(<ReportInteractive report={passingReport} />);
    expect(screen.queryByTestId("es-last-run-delta")).not.toBeInTheDocument();
  });
});

describe("renderReportToHtml scenario history embedding", () => {
  const history = { [SCENARIO_ID]: events("passed", "failed") };

  it("embeds the history JSON when interactive", () => {
    const html = renderReportToHtml(passingReport, {
      islandScript: "/* island */",
      scenarioHistory: history,
    });
    expect(html).toContain('id="es-report-history"');
    expect(html).toContain(SCENARIO_ID);
  });

  it("omits the history script for static output or empty maps", () => {
    const staticHtml = renderReportToHtml(passingReport, { scenarioHistory: history });
    expect(staticHtml).not.toContain('id="es-report-history"');

    const emptyHtml = renderReportToHtml(passingReport, { islandScript: "/* island */", scenarioHistory: {} });
    expect(emptyHtml).not.toContain('id="es-report-history"');
  });

  it("stamps the stale-days attribute on the island root", () => {
    const html = renderReportToHtml(passingReport, { islandScript: "/* island */", staleAfterDays: 14 });
    expect(html).toContain('data-es-stale-days="14"');
  });
});
