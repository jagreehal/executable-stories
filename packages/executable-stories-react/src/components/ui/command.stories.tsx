import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "./command";

const meta: Meta<typeof Command> = {
  title: "UI/Command",
  component: Command,
};
export default meta;

type Story = StoryObj<typeof Command>;

/**
 * Inline command palette (not the portalled CommandDialog), so items render in
 * the canvas. `aria-label` gives the cmdk input an accessible name for axe.
 */
export const Default: Story = {
  render: () => (
    <Command style={{ maxWidth: "24rem", border: "1px solid var(--border)" }}>
      <CommandInput placeholder="Type a command..." aria-label="Command input" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Scenarios">
          <CommandItem>
            Open passing scenarios
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem>Open failing scenarios</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Reports">
          <CommandItem>Generate HTML report</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Command input")).toBeVisible();
    await expect(canvas.getByText("Open passing scenarios")).toBeVisible();
  },
};
