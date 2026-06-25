import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { DocLink } from "./DocLink";

const meta: Meta<typeof DocLink> = {
  title: "Doc/DocLink",
  component: DocLink,
};
export default meta;

type Story = StoryObj<typeof DocLink>;

export const Default: Story = {
  args: {
    entry: { kind: "link", phase: "static", label: "Pricing policy", url: "https://example.com/policy" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole("link", { name: "Pricing policy" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "https://example.com/policy");
    await expect(link).toHaveAttribute("target", "_blank");
  },
};
