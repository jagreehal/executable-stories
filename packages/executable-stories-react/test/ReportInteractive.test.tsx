import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReportInteractive } from "../src/interactive/ReportInteractive";
import { mixedReport, passingReport, minimalReport } from "./fixtures/sample-report";

beforeEach(() => {
  // Scroll into view isn't implemented in jsdom; stub silently.
  Element.prototype.scrollIntoView = function () {};
  localStorage.clear();
});

describe("<ReportInteractive>", () => {
  it("renders the search input; the resting count is hidden (dedup with the All tab)", () => {
    render(<ReportInteractive report={mixedReport} />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    // No "N total" at rest — the "All N" status tab already carries the total.
    expect(screen.queryByText(/\btotal\b/)).toBeNull();
  });

  it("filters scenarios when the user types", () => {
    render(<ReportInteractive report={mixedReport} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "delete" } });
    expect(screen.getByText("1 of 3 scenarios")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Add /, level: 3 })).toBeNull();
    expect(screen.queryByRole("heading", { name: /Login/, level: 3 })).toBeNull();
    expect(screen.getByRole("heading", { name: /Delete/, level: 3 })).toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", () => {
    render(<ReportInteractive report={mixedReport} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "no-such-thing" } });
    expect(screen.getByText("No scenarios match the search.")).toBeInTheDocument();
  });

  it("renders a failure banner when failures exist", () => {
    render(<ReportInteractive report={mixedReport} />);
    expect(screen.getByLabelText("Failure summary")).toBeInTheDocument();
    expect(screen.getByLabelText("View first failure")).toBeInTheDocument();
  });

  it("hands the whole failing set to the clipboard as one prompt", async () => {
    const written: string[] = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: (t: string) => (written.push(t), Promise.resolve()) },
    });
    render(<ReportInteractive report={mixedReport} />);
    fireEvent.click(screen.getByLabelText("Copy failures for an agent"));
    await screen.findByText("Failures copied");
    expect(written).toHaveLength(1);
    expect(written[0]).toContain("Delete");
    expect(written[0]).toContain("Expected list to be empty after deletion");
  });

  it("greets a returning reader with what broke since THEIR last visit", async () => {
    localStorage.setItem(
      "es-last-visit",
      JSON.stringify({
        runId: "run-earlier",
        atMs: Date.now() - 3 * 24 * 60 * 60 * 1000,
        statuses: { "feature-todos--add": "passed", "feature-todos--delete": "passed" },
      }),
    );
    render(<ReportInteractive report={mixedReport} />);
    const strip = await screen.findByTestId("es-since-last-visit");
    expect(strip).toHaveTextContent("3 days ago");
    expect(strip).toHaveTextContent("Delete");
  });

  it("says nothing to a first-time reader", () => {
    render(<ReportInteractive report={mixedReport} />);
    expect(screen.queryByTestId("es-since-last-visit")).toBeNull();
  });

  it("records the visit, so the next visit compares against this run", async () => {
    render(<ReportInteractive report={mixedReport} />);
    await screen.findByLabelText("Failure summary");
    const stored = JSON.parse(localStorage.getItem("es-last-visit")!);
    expect(stored.runId).toBe("run-3");
    expect(stored.statuses["feature-todos--delete"]).toBe("failed");
  });

  it("offers no copy button when the run is green", () => {
    render(<ReportInteractive report={passingReport} />);
    expect(screen.queryByLabelText("Copy failures for an agent")).toBeNull();
  });

  it("does not render a failure banner when all pass", () => {
    render(<ReportInteractive report={passingReport} />);
    expect(screen.queryByLabelText("Failure summary")).toBeNull();
  });

  it("renders the keyboard-shortcut trigger button", () => {
    render(<ReportInteractive report={mixedReport} />);
    expect(screen.getByRole("button", { name: "Keyboard shortcuts" })).toBeInTheDocument();
  });

  it("Esc clears the search query", () => {
    render(<ReportInteractive report={mixedReport} />);
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "delete" } });
    expect(input.value).toBe("delete");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("");
  });

  it("renders an empty-report message when there is no data", () => {
    render(<ReportInteractive report={minimalReport} />);
    expect(screen.getByText("No scenarios in this report.")).toBeInTheDocument();
  });

  it("matches scenarios by step text (case-insensitive)", () => {
    render(<ReportInteractive report={mixedReport} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "USER DELETES" } });
    expect(screen.getByRole("heading", { name: /Delete/, level: 3 })).toBeInTheDocument();
  });
});
