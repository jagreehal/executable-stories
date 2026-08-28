import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ScenarioFreshnessProvider } from '../interactive/scenario-freshness-context';
import { ScenarioStaleness } from './ScenarioStaleness';

const NOW = Date.UTC(2026, 7, 29, 12);
const DAY = 86_400_000;

const meta: Meta<typeof ScenarioStaleness> = {
  title: 'Report/ScenarioStaleness',
  component: ScenarioStaleness,
};
export default meta;

type Story = StoryObj<typeof ScenarioStaleness>;

function withFreshness(lastRunAtMs: number | undefined, staleAfterDays = 7) {
  return (
    <ScenarioFreshnessProvider
      value={{
        staleAfterDays,
        report: { startedAtMs: NOW, finishedAtMs: NOW },
        nowMs: NOW,
      }}
    >
      <ScenarioStaleness scenario={{ lastRunAtMs }} />
    </ScenarioFreshnessProvider>
  );
}

export const Stale: Story = {
  render: () => withFreshness(NOW - 21 * DAY),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Scenario freshness')).toHaveTextContent(
      'Last ran 21 days ago',
    );
  },
};

export const FreshHidden: Story = {
  render: () => withFreshness(NOW - 2 * DAY),
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector('.es-report-island'),
    ).toBeEmptyDOMElement();
  },
};

export const MissingTimestampHidden: Story = {
  render: () => withFreshness(undefined),
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector('.es-report-island'),
    ).toBeEmptyDOMElement();
  },
};
