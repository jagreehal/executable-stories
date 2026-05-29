import type { Meta, StoryObj } from '@storybook/html';
import type { TestCaseResult } from '../../../types/test-result';
import { scenarioDeps } from '../storybook/_shared';
import {
  failedScenario,
  passedScenario,
  scenarioWithDocs,
  skippedScenario,
} from '../storybook/fixtures';
import { renderScenario } from './scenario';

const meta: Meta = {
  title: 'Renderers/Scenario',
  parameters: {
    docs: {
      description: {
        component:
          'Full scenario block with header, steps, docs, error box, attachments, trace, and action buttons. Failed scenarios get the ✨ copy-as-Claude-prompt button.',
      },
    },
  },
};
export default meta;

const render = (tc: TestCaseResult): string =>
  renderScenario({ tc }, scenarioDeps);

export const Passed: StoryObj = {
  render: () => render(passedScenario()),
};

export const Failed: StoryObj = {
  name: 'Failed (with ✨ copy-as-prompt button)',
  render: () => render(failedScenario()),
};

export const Skipped: StoryObj = {
  render: () => render(skippedScenario()),
};

export const WithRichDocs: StoryObj = {
  render: () => render(scenarioWithDocs()),
};

export const WithTickets: StoryObj = {
  render: () =>
    render(
      passedScenario({
        story: {
          ...passedScenario().story,
          scenario: 'Checkout behaviour carries ticket provenance',
          tickets: [
            { id: 'GEO-101', url: 'https://jira.example.com/browse/GEO-101' },
            { id: 'GEO-204' },
          ],
        },
      }),
    ),
};

export const StartCollapsed: StoryObj = {
  render: () =>
    renderScenario(
      { tc: passedScenario() },
      { ...scenarioDeps, startCollapsed: true },
    ),
};
