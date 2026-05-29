import type { Meta, StoryObj } from '@storybook/html';
import { scenarioDeps } from '../storybook/_shared';
import {
  failedScenario,
  passedScenario,
  skippedScenario,
} from '../storybook/fixtures';
import { escapeHtml } from '../template';
import { renderFeature } from './feature';
import { renderScenario } from './scenario';

const meta: Meta = { title: 'Renderers/Feature' };
export default meta;

const deps = {
  escapeHtml,
  startCollapsed: false,
  renderScenario,
  scenarioDeps,
};

export const MixedStatuses: StoryObj = {
  render: () =>
    renderFeature(
      {
        file: 'src/auth/login.story.test.ts',
        testCases: [
          passedScenario({ id: 'f-p1' }),
          failedScenario({ id: 'f-f1' }),
          skippedScenario({ id: 'f-s1' }),
        ],
      },
      deps,
    ),
};

export const AllPassed: StoryObj = {
  render: () =>
    renderFeature(
      {
        file: 'src/calc/add.story.test.ts',
        testCases: [
          passedScenario({
            id: 'a1',
            story: { ...passedScenario().story, scenario: '1 + 1 = 2' },
          }),
          passedScenario({
            id: 'a2',
            story: { ...passedScenario().story, scenario: '0 + 0 = 0' },
          }),
          passedScenario({
            id: 'a3',
            story: {
              ...passedScenario().story,
              scenario: 'negatives sum correctly',
            },
          }),
        ],
      },
      deps,
    ),
};

export const StartCollapsed: StoryObj = {
  render: () =>
    renderFeature(
      {
        file: 'src/auth/login.story.test.ts',
        testCases: [passedScenario({ id: 'c1' }), failedScenario({ id: 'c2' })],
      },
      { ...deps, startCollapsed: true },
    ),
};
