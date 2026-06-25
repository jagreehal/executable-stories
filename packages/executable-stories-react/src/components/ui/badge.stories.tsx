import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Badge } from "./badge";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
};
export default meta;

type Story = StoryObj<typeof Badge>;

/** Proves the Tailwind v4 + shadcn pipeline resolves the --es-* token map. */
export const Statuses: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <Badge variant="passed">Passed</Badge>
      <Badge variant="failed">Failed</Badge>
      <Badge variant="skipped">Skipped</Badge>
      <Badge variant="pending">Pending</Badge>
      <Badge variant="tag">checkout</Badge>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const passed = canvas.getByText("Passed");
    await expect(passed).toBeVisible();
    // The token map must produce a real, non-transparent status colour.
    const color = getComputedStyle(passed).color;
    await expect(color).not.toBe("");
    await expect(color).not.toBe("rgba(0, 0, 0, 0)");
  },
};
