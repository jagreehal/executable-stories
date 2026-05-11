import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportRoot } from "../src/context/ReportRoot";
import { ReportSummary, ReportSummaryView } from "../src/components/ReportSummary";
import { ReportFeatureList } from "../src/components/ReportFeatureList";
import { ReportFeature } from "../src/components/ReportFeature";
import { ReportScenario } from "../src/components/ReportScenario";
import { ReportEmpty } from "../src/components/ReportEmpty";
import { ReportSchemaError } from "../src/components/ReportSchemaError";
import { useReport } from "../src/hooks/useReport";
import { minimalReport, passingReport, mixedReport } from "./fixtures/sample-report";

describe("ReportRoot + useReport", () => {
  it("provides the report through context", () => {
    function Probe() {
      const r = useReport();
      return <span>{r.runId}</span>;
    }
    render(
      <ReportRoot report={passingReport}>
        <Probe />
      </ReportRoot>,
    );
    expect(screen.getByText("run-2")).toBeInTheDocument();
  });

  it("useReport throws when used outside ReportRoot", () => {
    function Probe() {
      useReport();
      return null;
    }
    expect(() => render(<Probe />)).toThrow(/useReport must be used inside/);
  });
});

describe("<ReportSummaryView>", () => {
  it("renders pre-computed counts", () => {
    const { container } = render(<ReportSummaryView summary={mixedReport.summary} ariaLabel="Run summary" />);
    expect(screen.getByLabelText("Run summary")).toHaveTextContent(/3 scenarios/);
    expect(container.querySelector("[data-status=\"failed\"]")).toHaveTextContent("1 failed");
  });

  it("hides skipped/pending counters when zero", () => {
    const { container } = render(<ReportSummaryView summary={passingReport.summary} />);
    expect(container.querySelector("[data-status=\"skipped\"]")).toBeNull();
    expect(container.querySelector("[data-status=\"pending\"]")).toBeNull();
  });
});

describe("<ReportFeatureList>", () => {
  it("renders one section per feature", () => {
    const { container } = render(
      <ReportRoot report={mixedReport}>
        <ReportFeatureList />
      </ReportRoot>,
    );
    expect(container.querySelectorAll("section.es-feature")).toHaveLength(2);
  });
});

describe("<ReportFeature>", () => {
  it("renders the feature title, source file, summary, and scenarios", () => {
    render(<ReportFeature feature={passingReport.features[0]!} />);
    expect(screen.getByRole("heading", { name: "Todos", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("src/todos.story.test.ts")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Add a todo/, level: 3 })).toBeInTheDocument();
  });
});

describe("<ReportScenario>", () => {
  it("uses data-status attribute reflecting status", () => {
    const { container } = render(<ReportScenario scenario={mixedReport.features[0]!.scenarios[1]!} />);
    expect(container.querySelector("article.es-scenario")?.getAttribute("data-status")).toBe("failed");
  });

  it("renders tags as an aria-labeled list", () => {
    render(<ReportScenario scenario={passingReport.features[0]!.scenarios[0]!} />);
    expect(screen.getByLabelText("Tags")).toBeInTheDocument();
    expect(screen.getByText("smoke")).toBeInTheDocument();
  });
});

describe("<ReportEmpty>", () => {
  it("renders default message and is announced politely", () => {
    const { container } = render(<ReportEmpty />);
    expect(container.querySelector(".es-empty")?.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("No scenarios in this report.")).toBeInTheDocument();
  });

  it("renders custom message when provided", () => {
    render(<ReportEmpty message="No matching scenarios." />);
    expect(screen.getByText("No matching scenarios.")).toBeInTheDocument();
  });
});

describe("<ReportSchemaError>", () => {
  it("renders the error message and issues", () => {
    render(
      <ReportSchemaError
        error={{
          message: "Validation failed (2 issues).",
          code: "VALIDATION_FAILED",
          issues: [
            { path: "/features", message: "Expected array" },
            { path: "/summary/total", message: "Expected integer" },
          ],
        }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Validation failed/);
    expect(screen.getByText(/2 validation issues/)).toBeInTheDocument();
  });

  it("renders upgrade hint for SCHEMA_VERSION_MISMATCH", () => {
    render(
      <ReportSchemaError
        error={{ message: "Schema major 2 is not supported", code: "SCHEMA_VERSION_MISMATCH" }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Upgrade the package/);
  });
});

describe("integration: empty data path", () => {
  it("renders ReportEmpty as the only content when features is empty", () => {
    const { container } = render(
      <ReportRoot report={minimalReport}>
        <ReportFeatureList />
        <ReportEmpty />
      </ReportRoot>,
    );
    expect(container.querySelectorAll("section.es-feature")).toHaveLength(0);
    expect(container.querySelector(".es-empty")).toBeTruthy();
  });
});
