import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportToc } from "./ReportToc";
import { ReportRoot } from "../context/ReportRoot";
import { kitchenSinkReport } from "../test/kitchen-sink";
import { reportFixture } from "../test/fixtures";

/**
 * ReportToc reads the (filtered) report from ReportContext, so every story wraps
 * it in <ReportRoot>. The nav is hidden below the `lg` breakpoint
 * (`hidden lg:block`), so assertions check presence/links in the DOM rather than
 * visibility, which depends on the Storybook viewport width.
 */
const meta: Meta<typeof ReportToc> = {
  title: "Interactive/ReportToc",
  component: ReportToc,
};
export default meta;

type Story = StoryObj<typeof ReportToc>;

export const Default: Story = {
  render: () => (
    <ReportRoot report={kitchenSinkReport()}>
      <ReportToc />
    </ReportRoot>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("navigation", { name: "Table of contents" })).toBeInTheDocument();
    // Feature headings render.
    await expect(canvas.getByText("Checkout")).toBeInTheDocument();
    await expect(canvas.getByText("Search")).toBeInTheDocument();
    // Scenario links render and point at the scenario anchor.
    const link = canvas.getByRole("link", { name: /caps the loyalty discount/i });
    await expect(link).toHaveAttribute("href", "#checkout-discount");
  },
};

export const SingleFeature: Story = {
  render: () => (
    <ReportRoot report={reportFixture()}>
      <ReportToc />
    </ReportRoot>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Checkout")).toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: /returning customer checks out/i }),
    ).toBeInTheDocument();
  },
};
