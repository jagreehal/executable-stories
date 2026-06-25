import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportFeature } from "./ReportFeature";
import { featureFixture } from "../test/fixtures";

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
    // Feature-header status counts (passed/failed/skipped fixture → ✓1 ✗1 ○1).
    await expect(canvas.getByText("✓1")).toBeVisible();
    await expect(canvas.getByText("✗1")).toBeVisible();
    await expect(canvas.getByText("○1")).toBeVisible();
  },
};
