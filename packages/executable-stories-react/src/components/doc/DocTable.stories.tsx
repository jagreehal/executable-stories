import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { DocTable } from "./DocTable";
import type { ReportDocTable } from "executable-stories-core";

const meta: Meta<typeof DocTable> = {
  title: "Doc/DocTable",
  component: DocTable,
};
export default meta;

type Story = StoryObj<typeof DocTable>;

function table(over: Partial<ReportDocTable> = {}): { entry: ReportDocTable } {
  return {
    entry: {
      kind: "table",
      phase: "static",
      label: "Discount tiers",
      columns: ["Requested", "Applied", "Saving"],
      rows: [
        ["20%", "20%", "$24.00"],
        ["45%", "30%", "$36.00"],
      ],
      ...over,
    },
  };
}

export const Small: Story = {
  args: table(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Discount tiers")).toBeVisible();
    await expect(canvas.getByRole("columnheader", { name: "Requested" })).toBeVisible();
    await expect(canvas.getByRole("cell", { name: "$36.00" })).toBeVisible();
  },
};

export const ManyColumns: Story = {
  args: table({
    label: "Pricing breakdown",
    columns: ["SKU", "Qty", "Unit", "Discount", "Tax", "Subtotal", "Total"],
    rows: [
      ["A-1", "2", "$10.00", "10%", "$1.80", "$18.00", "$19.80"],
      ["B-2", "1", "$29.99", "0%", "$3.00", "$29.99", "$32.99"],
    ],
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("columnheader")).toHaveLength(7);
    await expect(canvas.getByRole("cell", { name: "B-2" })).toBeVisible();
  },
};

export const EmptyRows: Story = {
  args: table({ label: "No matches yet", rows: [] }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("No matches yet")).toBeVisible();
    await expect(canvas.queryAllByRole("row")).toHaveLength(1); // header only
  },
};
