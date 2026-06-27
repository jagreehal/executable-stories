import type { Meta, StoryObj } from "@storybook/react-vite";
import { InboxIcon } from "lucide-react";
import { expect, within } from "storybook/test";
import { Button } from "./button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./empty";

const meta: Meta<typeof Empty> = {
  title: "UI/Empty",
  component: Empty,
};
export default meta;

type Story = StoryObj<typeof Empty>;

export const Default: Story = {
  render: () => (
    <Empty style={{ maxWidth: "28rem", border: "1px dashed var(--border)" }}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No scenarios yet</EmptyTitle>
        <EmptyDescription>
          Run your tests to generate a story report and they will show up here.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Run tests</Button>
      </EmptyContent>
    </Empty>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("No scenarios yet")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Run tests" })).toBeVisible();
  },
};
