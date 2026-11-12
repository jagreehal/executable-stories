import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
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

// The failing step prints the message, so the scenario shows it once. The
// stack trace sits in a collapsed section with a capped height.
export const FailedWithStack: Story = {
  args: {
    scenario: failedScenario({
      errorStack: Array.from({ length: 60 }, (_, i) => `    at frame${i} (src/checkout/step-${i}.ts:${i + 1}:5)`).join("\n"),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("alert")).toHaveLength(1);
    const summary = canvas.getByText("Stack trace");
    await expect(canvas.queryByText(/frame59/)).not.toBeVisible();
    await userEvent.click(summary);
    await expect(canvas.getByText(/frame59/)).toBeVisible();
  },
};

// A URL in the title wraps inside the card. Long tags truncate and show the
// full text on hover.
export const UnbreakableData: Story = {
  args: {
    scenario: passedScenario({
      title: "redirects to https://app.example.com/workspaces/northwind-industries-holdings/settings/members?tab=invitations&filter=expired",
      tags: ["area-14-customer-feedback-from-enterprise-onboarding", "smoke"],
    }),
  },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => (
    <div style={{ width: 360 }}>
      <ReportScenario {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>("[data-status]")!;
    await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
    await expect(within(canvasElement).getByTitle("area-14-customer-feedback-from-enterprise-onboarding")).toBeVisible();
  },
};
