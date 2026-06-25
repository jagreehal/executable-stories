import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportScenario } from "./ReportScenario";
import { failedScenario, passedScenario, skippedScenario } from "../test/fixtures";

const meta: Meta<typeof ReportScenario> = {
  title: "Report/Scenario",
  component: ReportScenario,
};
export default meta;

type Story = StoryObj<typeof ReportScenario>;

export const Passed: Story = {
  args: { scenario: passedScenario() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: /returning customer checks out/i }),
    ).toBeVisible();
    await expect(canvas.getByText(/a returning customer with a saved card/i)).toBeVisible();
  },
};

export const Failed: Story = {
  args: { scenario: failedScenario() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: /blocked when the card is declined/i }),
    ).toBeVisible();
    const alerts = canvas.getAllByRole("alert");
    await expect(alerts.length).toBeGreaterThan(0);
    await expect(alerts[0]).toHaveTextContent(/AssertionError/);
  },
};

export const Skipped: Story = {
  args: { scenario: skippedScenario() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: /gift wrapping is offered/i }),
    ).toBeVisible();
  },
};

// For the Astro detail page: the page heading owns the title, so the card omits
// its own — only the status badge + tags + steps remain.
export const HideTitle: Story = {
  args: { scenario: failedScenario(), hideTitle: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("heading")).toBeNull();
    await expect(canvas.getByText("Failed")).toBeVisible();
    await expect(canvas.getByText(/they confirm the order/i)).toBeVisible();
  },
};
