import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportEmpty } from "./ReportEmpty";

const meta: Meta<typeof ReportEmpty> = {
  title: "Report/Empty",
  component: ReportEmpty,
};
export default meta;

type Story = StoryObj<typeof ReportEmpty>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("No scenarios in this report.")).toBeVisible();
  },
};

export const CustomMessage: Story = {
  args: { message: "No matching scenarios." },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("No matching scenarios.")).toBeVisible();
  },
};
