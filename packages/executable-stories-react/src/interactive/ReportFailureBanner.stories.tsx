import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportFailureBanner } from "./ReportFailureBanner";
import type { FailureRef } from "./filter";

const failures: FailureRef[] = [
  {
    featureId: "feature-checkout",
    scenarioId: "checkout-declined",
    scenarioTitle: "Checkout is blocked when the card is declined",
    errorMessage: "expected order to be undefined",
  },
  {
    featureId: "feature-search",
    scenarioId: "search-ranking",
    scenarioTitle: "Search ranks exact matches first",
  },
];

const meta: Meta<typeof ReportFailureBanner> = {
  title: "Interactive/ReportFailureBanner",
  component: ReportFailureBanner,
};
export default meta;

type Story = StoryObj<typeof ReportFailureBanner>;

export const MultipleFailures: Story = {
  args: { failures },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Failure summary")).toBeVisible();
    await expect(canvas.getByText("2")).toBeVisible();
    await expect(canvas.getByText(/failures/)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "View first failure" })).toBeVisible();
  },
};

// One failure renders the singular "failure" wording.
export const SingleFailure: Story = {
  args: { failures: [failures[0]!] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("1")).toBeVisible();
    // Singular: "failure", not "failures".
    await expect(canvas.getByText(/failure$/)).toBeVisible();
  },
};

// Zero failures: the banner renders nothing at all.
export const NoFailures: Story = {
  args: { failures: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByLabelText("Failure summary")).toBeNull();
  },
};
