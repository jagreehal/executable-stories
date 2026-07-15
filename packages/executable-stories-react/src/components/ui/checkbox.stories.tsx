import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { useState } from "react";
import { Checkbox } from "./checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "UI/Checkbox",
  component: Checkbox,
};
export default meta;

type Story = StoryObj<typeof Checkbox>;

function Demo() {
  const [on, setOn] = useState(true);
  return (
    <div className="es-report-island flex items-center gap-2">
      <Checkbox id="demo" checked={on} onCheckedChange={setOn} />
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
    // The label associates via htmlFor → the checkbox has an accessible name.
    const cb = canvas.getByRole("checkbox", { name: "Expand all" });
    await expect(cb).toBeChecked();

    // Clicking the checkbox toggles it.
    await userEvent.click(cb);
    await expect(cb).not.toBeChecked();

    // Clicking the associated label toggles it too.
    await userEvent.click(canvas.getByText("Expand all"));
    await expect(cb).toBeChecked();
  },
};
