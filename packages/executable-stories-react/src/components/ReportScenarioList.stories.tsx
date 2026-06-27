import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportScenarioList } from "./ReportScenarioList";
import { featureFixture } from "../test/fixtures";

const meta: Meta<typeof ReportScenarioList> = {
  title: "Report/ScenarioList",
  component: ReportScenarioList,
};
export default meta;

type Story = StoryObj<typeof ReportScenarioList>;

// The default feature fixture holds a passed, a failed, and a skipped scenario —
// each rendered as a scenario card (h3 + status badge).
export const Default: Story = {
  args: { feature: featureFixture() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 3, name: /returning customer checks out/i })).toBeVisible();
    await expect(canvas.getByRole("heading", { level: 3, name: /blocked when the card is declined/i })).toBeVisible();
    await expect(canvas.getByRole("heading", { level: 3, name: /gift wrapping is offered/i })).toBeVisible();
    // The failed scenario surfaces its error as an alert.
    await expect(canvas.getAllByRole("alert").length).toBeGreaterThan(0);
  },
};

// A feature with no scenarios → nothing renders.
export const Empty: Story = {
  args: { feature: featureFixture({ scenarios: [] }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("heading")).toBeNull();
  },
};
