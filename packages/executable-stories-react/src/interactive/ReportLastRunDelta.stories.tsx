import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ReportLastRunDelta } from "./ReportLastRunDelta";
import { failedScenario, featureFixture, passedScenario, reportFixture, summaryOf } from "../test/fixtures";
import type { ScenarioRunEvent } from "../lib/run-history";

function events(...statuses: Array<ScenarioRunEvent["status"]>): ScenarioRunEvent[] {
  return statuses.map((status, i) => ({ timestamp: 1_700_000_000_000 + i * 1000, status }));
}

const broke = failedScenario({ id: "checkout-declined", title: "Checkout is blocked when the card is declined" });
const fixed = passedScenario({ id: "checkout-saved-card", title: "A returning customer checks out with a saved card" });
const fresh = passedScenario({ id: "checkout-gift-card", title: "A gift card covers the whole order" });
const scenarios = [broke, fixed, fresh];
const report = reportFixture({
  features: [featureFixture({ scenarios, summary: summaryOf(scenarios) })],
  summary: summaryOf(scenarios),
});

const meta: Meta<typeof ReportLastRunDelta> = {
  title: "Interactive/ReportLastRunDelta",
  component: ReportLastRunDelta,
};
export default meta;

type Story = StoryObj<typeof ReportLastRunDelta>;

// The strip answers the returning reader's only question — "what's different
// since I last looked" — with deep links straight to the scenarios that moved.
export const BehaviorChanged: Story = {
  args: {
    report,
    history: {
      [broke.id]: events("passed", "failed"),
      [fixed.id]: events("failed", "passed"),
      [fresh.id]: events("passed"),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/1 newly failing/)).toBeVisible();
    await expect(canvas.getByText(/1 fixed/)).toBeVisible();
    await expect(canvas.getByText(/1 new/)).toBeVisible();
    await expect(canvas.getByRole("link", { name: broke.title })).toBeVisible();
  },
};

// A quiet run still gets one reassuring line rather than silence, so "nothing
// changed" is a stated fact instead of an absence the reader must infer.
export const NoChanges: Story = {
  args: {
    report,
    history: {
      [broke.id]: events("failed", "failed"),
      [fixed.id]: events("passed", "passed"),
      [fresh.id]: events("passed", "passed"),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/no behavior changes/)).toBeVisible();
  },
};

// First run with history enabled: nothing to compare yet, so the strip stays
// out of the header instead of declaring every scenario "new".
export const FirstRun: Story = {
  args: {
    report,
    history: {
      [broke.id]: events("failed"),
      [fixed.id]: events("passed"),
      [fresh.id]: events("passed"),
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId("es-last-run-delta")).not.toBeInTheDocument();
  },
};
