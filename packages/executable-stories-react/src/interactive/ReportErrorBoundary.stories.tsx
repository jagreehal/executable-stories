import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportErrorBoundary } from "./ReportErrorBoundary";

function Crash(): never {
  throw new Error("Cannot read properties of undefined (reading 'toLowerCase')");
}

const meta: Meta<typeof ReportErrorBoundary> = {
  title: "Interactive/ReportErrorBoundary",
  component: ReportErrorBoundary,
};
export default meta;

type Story = StoryObj<typeof ReportErrorBoundary>;

// A record the report cannot render shows an explanation, not a blank page.
export const RenderError: Story = {
  render: () => (
    <ReportErrorBoundary>
      <Crash />
    </ReportErrorBoundary>
  ),
  play: async ({ canvasElement }) => {
    const alert = within(canvasElement).getByRole("alert");
    await expect(alert).toHaveTextContent("Report could not be displayed.");
    await expect(alert).toHaveTextContent("runs reset");
  },
};
