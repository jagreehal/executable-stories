import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { useState } from "react";
import { Switch } from "./switch";

const meta: Meta<typeof Switch> = {
  title: "UI/Switch",
  component: Switch,
};
export default meta;

type Story = StoryObj<typeof Switch>;

function Demo() {
  const [on, setOn] = useState(true);
  return (
    <div className="es-report-island flex items-center gap-2">
      <Switch id="demo" checked={on} onCheckedChange={setOn} />
      <label htmlFor="demo" className="cursor-pointer text-sm select-none">
        Expand all
      </label>
    </div>
  );
}

export const Default: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The label associates via htmlFor → the switch has an accessible name.
    const sw = canvas.getByRole("switch", { name: "Expand all" });
    await expect(sw).toBeChecked();

    // Clicking the switch toggles it.
    await userEvent.click(sw);
    await expect(sw).not.toBeChecked();

    // Clicking the associated label toggles it too.
    await userEvent.click(canvas.getByText("Expand all"));
    await expect(sw).toBeChecked();
  },
};
