import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { DocCustom } from "./DocCustom";

const meta: Meta<typeof DocCustom> = {
  title: "Doc/DocCustom",
  component: DocCustom,
};
export default meta;

type Story = StoryObj<typeof DocCustom>;

// With no matching custom renderer registered, the fallback pretty-prints the
// arbitrary `data` payload as JSON under its `type` label.
export const RankingDebug: Story = {
  args: {
    entry: {
      kind: "custom",
      phase: "static",
      type: "ranking-debug",
      data: { query: "wireles mouse", topScore: 0.94, corrected: "wireless mouse" },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("ranking-debug")).toBeVisible();
    await expect(canvas.getByText(/"corrected": "wireless mouse"/)).toBeVisible();
  },
};

export const ArrayData: Story = {
  args: {
    entry: {
      kind: "custom",
      phase: "static",
      type: "feature-flags",
      data: ["loyalty-cap", "fuzzy-search", "gift-wrap"],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("feature-flags")).toBeVisible();
    await expect(canvas.getByText(/"loyalty-cap"/)).toBeVisible();
  },
};
