import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReportInteractive } from "../src/interactive/ReportInteractive";
import { mixedReport, passingReport, minimalReport } from "./fixtures/sample-report";

beforeEach(() => {
  // Scroll into view isn't implemented in jsdom; stub silently.
  Element.prototype.scrollIntoView = function () {};
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

  it("renders a sticky failure banner when failures exist", () => {
    render(<ReportInteractive report={mixedReport} />);
    expect(screen.getByLabelText("Failure summary")).toBeInTheDocument();
    expect(screen.getByLabelText("View first failure")).toBeInTheDocument();
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
