import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportSteps } from "../src/components/ReportSteps";
import { failedScenario } from "../src/test/fixtures";

describe("ReportSteps expected/actual", () => {
  it("shows the failed assertion's expected and actual values", () => {
    const base = failedScenario();
    const scenario = {
      ...base,
      steps: base.steps.map((step) =>
        step.status === "failed" ? { ...step, expected: "3", actual: "2" } : step,
      ),
    };
    const { container } = render(<ReportSteps scenario={scenario} />);
    const block = container.querySelector('[data-slot="step-comparison"]');
    expect(block).not.toBeNull();
    expect(screen.getByText("Expected").nextElementSibling).toHaveTextContent("3");
    expect(screen.getByText("Actual").nextElementSibling).toHaveTextContent("2");
  });

  it("renders no comparison when the host reported none", () => {
    const { container } = render(<ReportSteps scenario={failedScenario()} />);
    expect(container.querySelector('[data-slot="step-comparison"]')).toBeNull();
  });
});
