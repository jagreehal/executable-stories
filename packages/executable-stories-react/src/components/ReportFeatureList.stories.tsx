import type { Meta, StoryObj } from "@storybook/react-vite";
import type { StoryReport } from "executable-stories-core";
import { expect, within } from "storybook/test";
import { ReportFeatureList } from "./ReportFeatureList";
import { ReportContext } from "../context/ReportContext";
import { featureFixture, reportFixture } from "../test/fixtures";

const meta: Meta<typeof ReportFeatureList> = {
  title: "Report/FeatureList",
  component: ReportFeatureList,
};
export default meta;

type Story = StoryObj<typeof ReportFeatureList>;

// ReportFeatureList reads report.features from ReportContext (useReport), so it
// must render inside a provider.
function withReport(report: StoryReport) {
  return function Render() {
    return (
      <ReportContext.Provider value={{ report, customRenderers: {}, renderers: {} }}>
        <ReportFeatureList />
      </ReportContext.Provider>
    );
  };
}

// Two features, each a <section> landmark with its own h2.
export const MultipleFeatures: Story = {
  render: withReport(
    reportFixture({
      features: [
        featureFixture({ id: "feat-checkout", title: "Checkout", sourceFile: "src/checkout.story.test.ts" }),
        featureFixture({ id: "feat-search", title: "Search", sourceFile: "src/search.story.test.ts" }),
      ],
    }),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 2, name: "Checkout" })).toBeVisible();
    await expect(canvas.getByRole("heading", { level: 2, name: "Search" })).toBeVisible();
  },
};

// No features → the component renders nothing.
export const Empty: Story = {
  render: withReport(reportFixture({ features: [] })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("heading")).toBeNull();
  },
};
