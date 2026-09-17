import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportFeature } from "./ReportFeature";
import { featureFixture, passedScenario, skippedScenario, summaryOf } from "../test/fixtures";

const meta: Meta<typeof ReportFeature> = {
  title: "Report/Feature",
  component: ReportFeature,
};
export default meta;

type Story = StoryObj<typeof ReportFeature>;

export const Default: Story = {
  args: { feature: featureFixture() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Checkout", level: 2 })).toBeVisible();
    await expect(canvas.getByText("src/checkout.story.test.ts")).toBeVisible();
    // Feature-header status counts render as readable, failure-weighted text.
    await expect(canvas.getByText("1 passed")).toBeVisible();
    await expect(canvas.getByText("1 failed")).toBeVisible();
    await expect(canvas.getByText("1 skipped")).toBeVisible();
  },
};

// `it.todo` scenarios are pending, not skipped: the count line must say so, in
// step with the "Pending" summary card and the "Planned" badge on the card.
export const PendingCountedSeparately: Story = {
  args: {
    feature: (() => {
      const scenarios = [
        passedScenario(),
        skippedScenario(),
        skippedScenario({ status: "pending", planned: true, title: "Gift wrapping is priced", steps: [] }),
      ];
      return featureFixture({ scenarios, summary: summaryOf(scenarios) });
    })(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("1 skipped")).toBeVisible();
    await expect(canvas.getByText("1 pending")).toBeVisible();
  },
};
