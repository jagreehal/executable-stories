import { renderFailureSummary } from "../../src/formatters/html/renderers/failure-summary";
import { escapeHtml } from "../../src/formatters/html/template";
import { failedScenario } from "../fixtures";
import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = { title: "Renderers/FailureSummary" };
export default meta;

const deps = { escapeHtml };

export const OneFailure: StoryObj = {
  render: () =>
    renderFailureSummary({ failedCases: [failedScenario()] }, deps),
};

export const MultipleFailures: StoryObj = {
  render: () =>
    renderFailureSummary(
      {
        failedCases: [
          failedScenario({
            id: "f1",
            story: {
              ...failedScenario().story,
              scenario: "Login fails with invalid password",
            },
          }),
          failedScenario({
            id: "f2",
            story: {
              ...failedScenario().story,
              scenario: "Checkout fails when cart is empty",
            },
          }),
          failedScenario({
            id: "f3",
            story: {
              ...failedScenario().story,
              scenario: "API returns 500 for malformed payload",
            },
          }),
        ],
      },
      deps,
    ),
};

export const Empty: StoryObj = {
  render: () => {
    const html = renderFailureSummary({ failedCases: [] }, deps);
    return html || '<p style="color:var(--muted-foreground)">No failures — nothing rendered.</p>';
  },
};
