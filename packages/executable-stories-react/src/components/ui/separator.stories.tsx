import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Separator } from "./separator";

const meta: Meta<typeof Separator> = {
  title: "UI/Separator",
  component: Separator,
};
export default meta;

type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
  render: () => (
    <div style={{ maxWidth: "20rem" }}>
      <p>Scenarios</p>
      <Separator className="my-2" />
      <p>Reports</p>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Scenarios")).toBeVisible();
    await expect(canvas.getByText("Reports")).toBeVisible();
  },
};

export const Vertical: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", height: "1.5rem" }}>
      <span>Passed</span>
      <Separator orientation="vertical" />
      <span>Failed</span>
      <Separator orientation="vertical" />
      <span>Skipped</span>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Passed")).toBeVisible();
    await expect(canvas.getByText("Skipped")).toBeVisible();
  },
};
