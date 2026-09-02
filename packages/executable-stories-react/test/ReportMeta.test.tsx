import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { StoryReport } from "executable-stories-core";
import { Report } from "../src/components/Report";
import { mixedReport, passingReport } from "./fixtures/sample-report";

const ciReport: StoryReport = {
  ...passingReport,
  gitSha: "a1b2c3d4e5f6",
  ci: {
    name: "GitHub Actions",
    url: "https://github.com/acme/shop/actions/runs/42",
    buildNumber: "42",
    branch: "feat/loyalty-cap",
    commitSha: "a1b2c3d4e5f6",
    prNumber: "318",
  },
};

describe("<ReportMeta> provenance", () => {
  it("shows the branch name", () => {
    render(<Report report={ciReport} />);
    const dl = screen.getByLabelText("Run metadata");
    expect(within(dl).getByText("Branch")).toBeInTheDocument();
    expect(within(dl).getByText("feat/loyalty-cap")).toBeInTheDocument();
  });

  it("links the shortened commit to the repo when derivable from the CI URL", () => {
    render(<Report report={ciReport} />);
    const link = screen.getByRole("link", { name: "a1b2c3d4" });
    expect(link).toHaveAttribute("href", "https://github.com/acme/shop/commit/a1b2c3d4e5f6");
  });

  it("links the PR number", () => {
    render(<Report report={ciReport} />);
    const link = screen.getByRole("link", { name: "#318" });
    expect(link).toHaveAttribute("href", "https://github.com/acme/shop/pull/318");
  });

  it("renders plain text commit and PR when no CI URL shape matches", () => {
    const report: StoryReport = {
      ...passingReport,
      gitSha: "a1b2c3d4e5f6",
      ci: { name: "Jenkins", url: "https://ci.acme.dev/job/shop/42/", prNumber: "9" },
    };
    render(<Report report={report} />);
    const dl = screen.getByLabelText("Run metadata");
    expect(within(dl).getByText("a1b2c3d4")).toBeInTheDocument();
    expect(within(dl).getByText("#9")).toBeInTheDocument();
    expect(within(dl).queryByRole("link", { name: "a1b2c3d4" })).not.toBeInTheDocument();
    expect(within(dl).queryByRole("link", { name: "#9" })).not.toBeInTheDocument();
  });
});

describe("<ReportMeta> slowest scenarios", () => {
  it("names the slowest scenarios so a long run has a suspect", () => {
    render(<Report report={mixedReport} />);
    const list = screen.getByLabelText("Slowest scenarios");
    // Delete (1200ms) outranks Login (1000ms), which outranks Add (800ms).
    const items = within(list).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Delete");
    expect(items[0]).toHaveTextContent("1.20 s");
    expect(items[1]).toHaveTextContent("Login");
  });

  it("links each one, so the slow scenario is one click away", () => {
    render(<Report report={mixedReport} />);
    const list = screen.getByLabelText("Slowest scenarios");
    expect(within(list).getByRole("link", { name: /Delete/ })).toHaveAttribute(
      "href",
      "#feature-todos--delete",
    );
  });

  it("stays quiet when a run is too small to have a slowest anything", () => {
    render(<Report report={passingReport} />);
    expect(screen.queryByLabelText("Slowest scenarios")).toBeNull();
  });
});
