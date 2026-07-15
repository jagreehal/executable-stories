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
    // Guard: the summary renders as stat cards, not a collapsed text line —
    // one card per status, each labelled + counted. Regressing to a plain
    // inline summary (the design bug this fixes) fails here.
    await expect(within(summary).getByText("Total")).toBeVisible();
    await expect(within(summary).getByText("Passed")).toBeVisible();
    await expect(within(summary).getByText("Failed")).toBeVisible();
    // 4 base cards (total/passed/failed/skipped) always render.
    expect(summary.querySelectorAll("[data-status]").length).toBeGreaterThanOrEqual(4);
  },
};
