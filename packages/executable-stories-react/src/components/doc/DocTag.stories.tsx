import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { DocTag } from "./DocTag";

const meta: Meta<typeof DocTag> = {
  title: "Doc/DocTag",
  component: DocTag,
};
export default meta;

type Story = StoryObj<typeof DocTag>;

export const SingleTag: Story = {
  args: { entry: { kind: "tag", phase: "static", names: ["smoke"] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("list", { name: "Tags" })).toBeVisible();
    await expect(canvas.getByText("smoke")).toBeVisible();
  },
};

export const ManyTags: Story = {
  args: {
    entry: {
      kind: "tag",
      phase: "static",
      names: ["checkout", "pricing", "smoke", "regression-guard", "finance-approved"],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const items = within(canvas.getByRole("list", { name: "Tags" })).getAllByRole("listitem");
    await expect(items).toHaveLength(5);
    await expect(canvas.getByText("regression-guard")).toBeVisible();
  },
};
