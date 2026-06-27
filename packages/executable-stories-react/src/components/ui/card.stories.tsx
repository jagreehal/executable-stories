import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Composed: Story = {
  render: () => (
    <Card style={{ maxWidth: "24rem" }}>
      <CardHeader>
        <CardTitle>Checkout summary</CardTitle>
        <CardDescription>Review your order before paying.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>One returning customer, one saved card, two items.</p>
      </CardContent>
      <CardFooter>
        <Button>Place order</Button>
      </CardFooter>
    </Card>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Checkout summary")).toBeVisible();
    await expect(canvas.getByText("Review your order before paying.")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Place order" })).toBeVisible();
  },
};
