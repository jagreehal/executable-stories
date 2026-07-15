import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const meta: Meta = {
  title: "UI/DropdownMenu",
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj;

function DisplayMenu() {
  const [mode, setMode] = useState("failures");
  const [docs, setDocs] = useState(true);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs">
        Display
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setMode(v as string)}>
          <DropdownMenuRadioItem value="expanded">Expanded</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="failures">Failures only</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="collapsed">Collapsed</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={docs} onCheckedChange={(c) => setDocs(!!c)}>
          Show documentation
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Opens the menu, confirms the current radio mode is announced, and switches it.
export const Display: Story = {
  render: () => <DisplayMenu />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Display" }));
    const failures = await canvas.findByRole("menuitemradio", { name: "Failures only" });
    await expect(failures).toHaveAttribute("aria-checked", "true");
    const collapsed = canvas.getByRole("menuitemradio", { name: "Collapsed" });
    await expect(collapsed).toHaveAttribute("aria-checked", "false");
  },
};

// A plain action menu (the scenario "•••" overflow shape).
export const Actions: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer rounded border border-border px-2 py-1 text-xs">
        Actions
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Copy link</DropdownMenuItem>
        <DropdownMenuItem>Copy as Markdown</DropdownMenuItem>
        <DropdownMenuItem>Explain with AI</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Actions" }));
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByRole("menuitem", { name: "Copy as Markdown" })).toBeVisible();
  },
};
