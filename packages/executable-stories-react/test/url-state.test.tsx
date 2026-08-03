import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";

import { ReportInteractive } from "../src/interactive/ReportInteractive";
import { mixedReport } from "./fixtures/sample-report";

// URL writes are debounced so keystrokes coalesce into one history entry.
const WRITE_DELAY_MS = 250;

function flushUrlWrite() {
  act(() => {
    vi.advanceTimersByTime(WRITE_DELAY_MS);
  });
}

beforeEach(() => {
  Element.prototype.scrollIntoView = function () {};
  window.location.hash = "";
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  window.location.hash = "";
});

describe("report view state in the URL", () => {
  it("puts the search query in the fragment", () => {
    render(<ReportInteractive report={mixedReport} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "delete" } });
    flushUrlWrite();
    expect(window.location.hash).toBe("#?q=delete");
  });

  it("puts a clicked tag in the fragment", () => {
    render(<ReportInteractive report={mixedReport} />);
    // Scoped to the filter row: scenario cards show the same tag as a badge.
    fireEvent.click(within(screen.getByLabelText("Filter by tag")).getByText("wip"));
    flushUrlWrite();
    expect(window.location.hash).toBe("#?tags=wip");
  });

  it("restores the filters from the fragment on load", () => {
    window.location.hash = "#?q=delete";
    render(<ReportInteractive report={mixedReport} />);
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("delete");
    expect(screen.getByText("1 of 3 scenarios")).toBeInTheDocument();
  });

  it("clears the fragment when the filters go back to their defaults", () => {
    render(<ReportInteractive report={mixedReport} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "delete" } });
    flushUrlWrite();
    fireEvent.change(input, { target: { value: "" } });
    flushUrlWrite();
    expect(window.location.hash).toBe("");
  });

  it("keeps a scenario deep link alongside the filters", () => {
    window.location.hash = "#scenario-1";
    render(<ReportInteractive report={mixedReport} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "delete" } });
    flushUrlWrite();
    expect(window.location.hash).toBe("#scenario-1?q=delete");
  });
});
