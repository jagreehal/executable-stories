import type { Meta, StoryObj } from "@storybook/react-vite";
import type { StoryReport } from "executable-stories-core";
import { expect, within } from "storybook/test";
import { ReportMeta } from "./ReportMeta";
import { ReportContext } from "../context/ReportContext";
import { reportFixture } from "../test/fixtures";
import { kitchenSinkReport } from "../test/kitchen-sink";

const meta: Meta<typeof ReportMeta> = {
  title: "Report/Meta",
  component: ReportMeta,
};
export default meta;

type Story = StoryObj<typeof ReportMeta>;

// ReportMeta reads the top-level StoryReport fields from ReportContext (via
// useReport), so it must be rendered inside a ReportContext.Provider.
function withReport(report: StoryReport) {
  return function Render() {
    return (
      <ReportContext.Provider value={{ report, customRenderers: {}, renderers: {} }}>
        <ReportMeta />
      </ReportContext.Provider>
    );
  };
}

// Basic run metadata: started timestamp + duration (the fixture sets no version,
// git SHA, or CI).
export const RunMetadata: Story = {
  render: withReport(reportFixture({ startedAtMs: 1_717_000_000_000 })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dl = canvas.getByLabelText("Run metadata");
    await expect(within(dl).getByText("Started")).toBeVisible();
    await expect(within(dl).getByText("Duration")).toBeVisible();
  },
};

// Full metadata line: started, duration, package version, git SHA, and a linked
// CI run — all the fields the kitchen-sink report populates.
export const FullMetadata: Story = {
  render: withReport(kitchenSinkReport()),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dl = canvas.getByLabelText("Run metadata");
    await expect(within(dl).getByText("Version")).toBeVisible();
    await expect(within(dl).getByText("1.4.0")).toBeVisible();
    await expect(within(dl).getByText("Commit")).toBeVisible();
    await expect(within(dl).getByRole("link", { name: /GitHub Actions/ })).toBeVisible();
  },
};
