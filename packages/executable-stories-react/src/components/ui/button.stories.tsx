import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
};
export default meta;

type Story = StoryObj<typeof Button>;

const variants = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;
const sizes = ["default", "xs", "sm", "lg"] as const;

/** Every cva variant, each with visible text so the axe button-name rule passes. */
export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      {variants.map((variant) => (
        <Button key={variant} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const variant of variants) {
      await expect(canvas.getByRole("button", { name: variant })).toBeVisible();
    }
  },
};

/** Text-based sizes (icon sizes are covered separately so they keep accessible names). */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
      {sizes.map((size) => (
        <Button key={size} size={size}>
          Size {size}
        </Button>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const size of sizes) {
      await expect(canvas.getByRole("button", { name: `Size ${size}` })).toBeVisible();
    }
  },
};

export const Disabled: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <Button disabled>Disabled default</Button>
      <Button variant="outline" disabled>
        Disabled outline
      </Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Disabled default" })).toBeDisabled();
  },
};
