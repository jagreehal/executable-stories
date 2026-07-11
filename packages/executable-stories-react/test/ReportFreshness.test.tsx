import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportFreshness } from "../src/interactive/ReportFreshness";
import { Report } from "../src/components/Report";
import { passingReport } from "./fixtures/sample-report";

const DAY = 86_400_000;
const NOW = 1_700_000_000_000;

describe("<ReportFreshness>", () => {
  it("shows a 'Verified N ago' line while the report is fresh", () => {
    render(<ReportFreshness lastRunMs={NOW - 2 * 3_600_000} staleAfterDays={7} nowMs={NOW} />);
    const status = screen.getByLabelText("Report freshness");
    expect(status.textContent).toContain("Verified 2 hours ago");
    expect(status.className).toContain("es-freshness");
  });

  it("links to the CI run when a URL is available", () => {
    render(
      <ReportFreshness
        lastRunMs={NOW - 60_000}
        ciUrl="https://github.com/acme/shop/actions/runs/42"
        staleAfterDays={7}
        nowMs={NOW}
      />,
    );
    expect(screen.getByRole("link", { name: "View CI run" })).toHaveAttribute(
      "href",
      "https://github.com/acme/shop/actions/runs/42",
    );
  });

  it("switches to the stale warning banner past the threshold", () => {
    render(<ReportFreshness lastRunMs={NOW - 12 * DAY} staleAfterDays={7} nowMs={NOW} />);
    const banner = screen.getByRole("status", { name: "Report freshness" });
    expect(banner.className).toContain("es-stale-banner");
    expect(banner.textContent).toContain("Last verified 12 days ago");
    expect(banner.textContent).toContain("may no longer match");
  });

  it("never warns when the threshold is 0 (disabled)", () => {
    render(<ReportFreshness lastRunMs={NOW - 100 * DAY} staleAfterDays={0} nowMs={NOW} />);
    const status = screen.getByLabelText("Report freshness");
    expect(status.className).toContain("es-freshness");
  });

  it("renders nothing without a run timestamp", () => {
    const { container } = render(<ReportFreshness staleAfterDays={7} nowMs={NOW} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("stays out of the static report tree (no-JS fallback shows no age)", () => {
    // The static <Report> has no clock; freshness is interactive-only so a
    // report generated once and read weeks later cannot show a stale age.
    render(<Report report={passingReport} />);
    expect(screen.queryByLabelText("Report freshness")).not.toBeInTheDocument();
  });
});
