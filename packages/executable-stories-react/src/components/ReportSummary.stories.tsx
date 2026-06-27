import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportSummaryView } from "./ReportSummary";
import { reportFixture } from "../test/fixtures";

const meta: Meta<typeof ReportSummaryView> = {
  title: "Report/Summary",
  component: ReportSummaryView,
};
export default meta;

type Story = StoryObj<typeof ReportSummaryView>;

export const RunSummary: Story = {
  args: { summary: reportFixture().summary, ariaLabel: "Run summary" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summary = canvas.getByLabelText("Run summary");
    await expect(summary).toHaveTextContent(/3 scenarios/);
    await expect(within(summary).getByText("1 passed")).toBeVisible();
    await expect(within(summary).getByText("1 failed")).toBeVisible();
  },
};
