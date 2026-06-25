import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { DocNote } from "./DocNote";

const meta: Meta<typeof DocNote> = {
  title: "Doc/DocNote",
  component: DocNote,
};
export default meta;

type Story = StoryObj<typeof DocNote>;

export const Default: Story = {
  args: {
    entry: { kind: "note", phase: "static", text: "Seeded from the standard fixture cart." },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Seeded from the standard fixture cart.")).toBeVisible();
  },
};

export const LongNote: Story = {
  args: {
    entry: {
      kind: "note",
      phase: "static",
      text: "Skipped until the gift-wrap service ships (SHOP-400). Once it lands we expect the free-wrap threshold to apply automatically for orders above the configured amount.",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/gift-wrap service ships/)).toBeVisible();
  },
};
