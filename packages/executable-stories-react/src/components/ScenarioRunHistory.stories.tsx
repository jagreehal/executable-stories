import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ScenarioRunHistory } from "./ScenarioRunHistory";
import { ScenarioHistoryProvider } from "../interactive/scenario-history-context";
import type { ScenarioRunEvent, ScenarioRunStatus } from "../lib/run-history";

const ID = "feature-checkout--pay-by-card";

function events(...statuses: ScenarioRunStatus[]): ScenarioRunEvent[] {
  return statuses.map((status, i) => ({
    timestamp: 1_750_000_000_000 + i * 86_400_000,
    status,
    commitSha: `c0ffee${i}${i}`,
  }));
}

const meta: Meta<typeof ScenarioRunHistory> = {
  title: "Report/ScenarioRunHistory",
  component: ScenarioRunHistory,
};
export default meta;

type Story = StoryObj<typeof ScenarioRunHistory>;

function withHistory(history: ScenarioRunEvent[]) {
  return function Render() {
    return (
      <ScenarioHistoryProvider value={{ [ID]: history }}>
        <ScenarioRunHistory scenarioId={ID} />
      </ScenarioHistoryProvider>
    );
  };
}

// The healthy case: a mostly-green strip whose tooltip carries the summary.
export const MostlyPassing: Story = {
  render: withHistory(events("passed", "passed", "failed", "passed", "passed")),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const strip = canvas.getByRole("img", { name: /4\/5 runs passed/ });
    await expect(strip).toBeVisible();
  },
};

// A regression in progress: trailing red dots read as "failing for 2 runs".
export const RecentlyRegressed: Story = {
  render: withHistory(events("passed", "passed", "passed", "failed", "failed")),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img", { name: /Failing for the last 2 runs/ })).toBeVisible();
  },
};

// A single run renders nothing — one data point is not a timeline.
export const SingleRunHidden: Story = {
  render: withHistory(events("passed")),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("img")).not.toBeInTheDocument();
  },
};
