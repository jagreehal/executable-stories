import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { DocSection } from "./DocSection";

const meta: Meta<typeof DocSection> = {
  title: "Doc/DocSection",
  component: DocSection,
};
export default meta;

type Story = StoryObj<typeof DocSection>;

export const RichMarkdown: Story = {
  args: {
    entry: {
      kind: "section",
      phase: "static",
      title: "Why this rule exists",
      markdown: [
        "Loyalty stacking used to let a few accounts reach **negative totals**.",
        "",
        "The cap keeps margins safe:",
        "",
        "- First, the requested discount is read",
        "- Then it is clamped to the ceiling",
        "- Finally `applyDiscount(cart)` returns the new total",
        "",
        "See the [pricing policy](https://example.com/policy) for the full rationale.",
      ].join("\n"),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Why this rule exists" })).toBeVisible();
    await expect(canvas.getByText("negative totals")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "pricing policy" })).toBeVisible();
    await expect(canvas.getByText(/clamped to the ceiling/i)).toBeVisible();
  },
};

export const HeadingsAndInlineCode: Story = {
  args: {
    entry: {
      kind: "section",
      phase: "static",
      title: "Setup notes",
      markdown: [
        "## Prerequisites",
        "",
        "Install the adapter, then run `pnpm test` before generating the report.",
        "",
        "### Environment",
        "",
        "1. Node `>= 22`",
        "2. pnpm `10`",
      ].join("\n"),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Prerequisites" })).toBeVisible();
    await expect(canvas.getByText("pnpm test")).toBeVisible();
  },
};
