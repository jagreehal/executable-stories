import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { useState } from "react";
import { AlignJustify, Filter, Minus } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const meta: Meta<typeof ToggleGroup> = {
  title: "UI/ToggleGroup",
  component: ToggleGroup,
};
export default meta;

type Story = StoryObj<typeof ToggleGroup>;

function ViewModes() {
  const [value, setValue] = useState<string[]>(["expanded"]);
  return (
    <div className="es-report-island">
      <ToggleGroup size="sm" value={value} onValueChange={setValue} aria-label="View mode">
        <ToggleGroupItem value="expanded" aria-label="Expanded">
          <AlignJustify />
          Expanded
        </ToggleGroupItem>
        <ToggleGroupItem value="failures" aria-label="Failures only">
          <Filter />
          Failures only
        </ToggleGroupItem>
        <ToggleGroupItem value="collapsed" aria-label="Collapsed">
          <Minus />
          Collapsed
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export const Segmented: Story = {
  render: () => <ViewModes />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const expanded = canvas.getByRole("button", { name: "Expanded" });
    // Selection starts on Expanded (data-pressed drives the fill).
    await expect(expanded).toHaveAttribute("data-pressed");

    const collapsed = canvas.getByRole("button", { name: "Collapsed" });
    await userEvent.click(collapsed);
    // Single-select: clicking one moves the pressed state off the other.
    await expect(collapsed).toHaveAttribute("data-pressed");
    await expect(expanded).not.toHaveAttribute("data-pressed");
  },
};
