import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";

const meta: Meta<typeof Dialog> = {
  title: "UI/Dialog",
  component: Dialog,
};
export default meta;

type Story = StoryObj<typeof Dialog>;

/**
 * `defaultOpen` renders the content without interaction. Radix portals the
 * content to document.body, so assertions use `within(document.body)`. The
 * DialogTitle + DialogDescription keep the dialog axe-clean.
 */
export const Open: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete report?</DialogTitle>
          <DialogDescription>
            This permanently removes the generated story report.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async () => {
    const body = within(document.body);
    await expect(body.getByRole("dialog")).toBeVisible();
    await expect(body.getByText("Delete report?")).toBeVisible();
  },
};
