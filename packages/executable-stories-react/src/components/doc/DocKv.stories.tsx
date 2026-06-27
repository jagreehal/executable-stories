import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { DocKv } from "./DocKv";
import type { ReportDocKv } from "executable-stories-core";

const meta: Meta<typeof DocKv> = {
  title: "Doc/DocKv",
  component: DocKv,
};
export default meta;

type Story = StoryObj<typeof DocKv>;

function kv(value: unknown, label = "Requested discount"): { entry: ReportDocKv } {
  return { entry: { kind: "kv", phase: "static", label, value } };
}

export const StringValue: Story = {
  args: kv("a returning customer", "Persona"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Persona")).toBeVisible();
    await expect(canvas.getByText("a returning customer")).toBeVisible();
  },
};

export const NumberValue: Story = {
  args: kv(0.45),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Requested discount")).toBeVisible();
    await expect(canvas.getByText("0.45")).toBeVisible();
  },
};

export const BooleanValue: Story = {
  args: kv(false, "Retriable"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("false")).toBeVisible();
  },
};

export const ObjectValue: Story = {
  args: kv({ code: "declined", retriable: false }, "Gateway response"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Gateway response")).toBeVisible();
    await expect(canvas.getByText(/"code":"declined"/)).toBeVisible();
  },
};

export const NullValue: Story = {
  args: kv(null, "Coupon"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("null")).toBeVisible();
  },
};
