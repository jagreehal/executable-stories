import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportTrace } from "./ReportTrace";
import { kitchenSinkReport } from "../test/kitchen-sink";

const meta: Meta<typeof ReportTrace> = {
  title: "Report/Trace",
  component: ReportTrace,
};
export default meta;

type Story = StoryObj<typeof ReportTrace>;

// The passing checkout scenario in the kitchen-sink report carries a 3-span OTel
// trace (a root request with two child spans).
const passingSpans = kitchenSinkReport().features[0]!.scenarios[0]!.otelSpans;
// The failed checkout scenario's trace has error-status spans (rendered with the
// fail bar colour).
const failingSpans = kitchenSinkReport().features[0]!.scenarios[1]!.otelSpans;

// Populated waterfall. Collapsed by default (native <details>); the summary shows
// the span count and total duration, so we open it to assert a span name.
export const Populated: Story = {
  args: { spans: passingSpans },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summary = canvas.getByText(/3 spans/);
    await expect(summary).toBeVisible();
    summary.click();
    await expect(canvas.getByText("pricing.applyDiscount")).toBeVisible();
  },
};

export const ErrorSpans: Story = {
  args: { spans: failingSpans },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summary = canvas.getByText(/2 spans/);
    await expect(summary).toBeVisible();
    summary.click();
    await expect(canvas.getByText("payments.charge")).toBeVisible();
  },
};

// No spans → the component renders nothing.
export const Empty: Story = {
  args: { spans: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(/span/)).toBeNull();
  },
};
