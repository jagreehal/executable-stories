import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
};
export default meta;

type Story = StoryObj<typeof Input>;

/** A label keeps the field axe-clean (inputs need an accessible name). */
export const Default: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "0.375rem", maxWidth: "20rem" }}>
      <label htmlFor="email">Email</label>
      <Input id="email" type="email" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Email")).toBeVisible();
  },
};

export const WithPlaceholder: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "0.375rem", maxWidth: "20rem" }}>
      <label htmlFor="search">Search scenarios</label>
      <Input id="search" placeholder="returning customer..." />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Search scenarios");
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute("placeholder", "returning customer...");
  },
};

export const Disabled: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "0.375rem", maxWidth: "20rem" }}>
      <label htmlFor="disabled-input">Read-only field</label>
      <Input id="disabled-input" defaultValue="locked" disabled />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Read-only field")).toBeDisabled();
  },
};
