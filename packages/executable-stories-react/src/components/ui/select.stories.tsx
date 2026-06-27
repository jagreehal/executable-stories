import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
};
export default meta;

type Story = StoryObj<typeof Select>;

/**
 * Radix Select renders its list in a portal only once opened, so the play fn
 * asserts the trigger (the always-present, accessible-named element). The
 * label + aria-labelledby give the trigger an accessible name for axe.
 */
export const Default: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "0.375rem", maxWidth: "20rem" }}>
      <span id="status-filter-label">Filter by status</span>
      <Select>
        <SelectTrigger aria-labelledby="status-filter-label">
          <SelectValue placeholder="Select a status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="passed">Passed</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="skipped">Skipped</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("combobox", { name: "Filter by status" });
    await expect(trigger).toBeVisible();
  },
};
