import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Report } from "../src/components/Report";
import { minimalReport, passingReport, mixedReport } from "./fixtures/sample-report";
import { err } from "../src/result";

describe("<Report>", () => {
  it("renders a <main> landmark with the default label", () => {
    render(<Report report={passingReport} />);
    expect(screen.getByRole("main", { name: "Test report" })).toBeInTheDocument();
  });

  it("renders the summary counts as stat cards", () => {
    render(<Report report={mixedReport} />);
    const summary = screen.getByLabelText("Run summary");
    // One labelled card per status; each holds its count.
    for (const label of ["Total", "Passed", "Failed", "Skipped"]) {
      expect(within(summary).getByText(label)).toBeInTheDocument();
    }
    expect(within(summary).getByText("3")).toBeInTheDocument();
  });

  it("renders one <section> per feature with title and source file", () => {
    render(<Report report={mixedReport} />);
    expect(screen.getByRole("heading", { name: "Todos", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Auth", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("src/todos.story.test.ts")).toBeInTheDocument();
    expect(screen.getByText("src/auth.story.test.ts")).toBeInTheDocument();
  });

  it("renders one scenario card per scenario with stable id + aria-labelledby", () => {
    const { container } = render(<Report report={mixedReport} />);
    const articles = container.querySelectorAll('[data-slot="card"]');
    expect(articles).toHaveLength(3);
    for (const a of Array.from(articles)) {
      expect(a.getAttribute("id")).toBeTruthy();
      expect(a.getAttribute("aria-labelledby")).toBe(`${a.getAttribute("id")}-title`);
    }
  });

  it("renders an <ol> of steps with keyword and text for non-empty scenarios", () => {
    const { container } = render(<Report report={passingReport} />);
    const stepsList = container.querySelector('ol[data-slot="steps"]')!;
    expect(stepsList).toBeInTheDocument();
    expect(within(stepsList as HTMLElement).getByText("Given")).toBeInTheDocument();
    expect(within(stepsList as HTMLElement).getByText("no todos exist")).toBeInTheDocument();
    expect(within(stepsList as HTMLElement).getAllByRole("listitem")).toHaveLength(3);
  });

  it("renders the failure error message with role=alert for failed scenarios", () => {
    render(<Report report={mixedReport} />);
    const alerts = screen.getAllByRole("alert");
    expect(alerts.some((a) => a.textContent?.includes("Expected list to be empty"))).toBe(true);
  });

  it("renders <ReportEmpty> when no features are present", () => {
    render(<Report report={minimalReport} />);
    expect(screen.getByText("No scenarios in this report.")).toBeInTheDocument();
  });

  it("renders <ReportSchemaError> when given a failed Result", () => {
    render(<Report report={err({ message: "boom", code: "VALIDATION_FAILED", issues: [{ path: "/features", message: "missing" }] })} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/Report could not be displayed/);
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
  });

  it("supports Result.ok=true input transparently", () => {
    render(<Report report={{ ok: true, data: passingReport }} />);
    expect(screen.getByRole("heading", { name: "Todos", level: 2 })).toBeInTheDocument();
  });

  it("renders the scenario title as h3 and a passing scenario's status as sr-only text (no visible pill)", () => {
    render(<Report report={passingReport} />);
    expect(screen.getByRole("heading", { name: /Add a todo/, level: 3 })).toBeInTheDocument();
    // A passing scenario drops the visible status pill — the green ✓ + title
    // carry it — but keeps the status accessible to screen readers as sr-only
    // text. (Non-pass statuses keep the aria-labelled badge; see the next test.)
    expect(screen.getByText("Status: Passed")).toBeInTheDocument();
  });

  it("labels planned scenarios (it.todo) as Planned instead of Pending", () => {
    const plannedReport = JSON.parse(JSON.stringify(passingReport));
    plannedReport.features[0].scenarios[0].status = "pending";
    plannedReport.features[0].scenarios[0].planned = true;
    render(<Report report={plannedReport} />);
    expect(screen.getByLabelText("Status: Planned")).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });

  it("escapes user content via React text rendering (no innerHTML for titles)", () => {
    const xssReport = JSON.parse(JSON.stringify(passingReport));
    xssReport.features[0].scenarios[0].title = "<script>alert('xss')</script>";
    const { container } = render(<Report report={xssReport} />);
    expect(container.querySelector("script")).toBeNull();
  });
});
