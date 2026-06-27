import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ScenarioExplorer, type ExplorerScenario } from "./ScenarioExplorer";

const scenarios: ExplorerScenario[] = [
  { id: "1", title: "Checkout is blocked when the card is declined", status: "failed", tags: ["checkout", "payments"], feature: "src/checkout.story.test.ts", href: "#1" },
  { id: "2", title: "A returning customer checks out with a saved card", status: "passed", tags: ["checkout"], feature: "src/checkout.story.test.ts", href: "#2" },
  { id: "3", title: "Gift wrapping is offered above the free-wrap threshold", status: "skipped", tags: ["checkout"], feature: "src/checkout.story.test.ts", href: "#3" },
  { id: "4", title: "Search ranks exact title matches first", status: "passed", tags: ["search"], feature: "src/search.story.test.ts", href: "#4" },
];

const meta: Meta<typeof ScenarioExplorer> = {
  title: "Report/ScenarioExplorer",
  component: ScenarioExplorer,
};
export default meta;

type Story = StoryObj<typeof ScenarioExplorer>;

export const Default: Story = {
  args: { scenarios, summary: { total: 4, passed: 2, failed: 1 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Checkout is blocked/i)).toBeVisible();

    const input = canvas.getByPlaceholderText(/search scenarios/i);
    await userEvent.type(input, "gift wrapping");

    await expect(canvas.getByText(/Gift wrapping is offered/i)).toBeVisible();
    // cmdk unmounts non-matching items.
    await expect(canvas.queryByText(/Checkout is blocked/i)).toBeNull();
  },
};

// Clicking a status pill is the other way to narrow the list — regression cover
// for the pills, which the search-only Default story didn't exercise.
export const FilterByStatusPill: Story = {
  args: { scenarios, summary: { total: 4, passed: 2, failed: 1 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // All scenarios visible to start.
    await expect(canvas.getByText(/Checkout is blocked/i)).toBeVisible();
    await expect(canvas.getByText(/A returning customer/i)).toBeVisible();

    const failedPill = canvas.getByRole("button", { name: "Failed" });
    await userEvent.click(failedPill);

    // The pill reflects the active filter…
    await expect(failedPill).toHaveAttribute("aria-pressed", "true");
    // …and only the failed scenario remains (passed/skipped rows unmount).
    await expect(canvas.getByText(/Checkout is blocked/i)).toBeVisible();
    await expect(canvas.queryByText(/A returning customer/i)).toBeNull();
    await expect(canvas.queryByText(/Gift wrapping is offered/i)).toBeNull();

    // Returning to "All" restores the full list.
    await userEvent.click(canvas.getByRole("button", { name: "All" }));
    await expect(canvas.getByText(/A returning customer/i)).toBeVisible();
  },
};
