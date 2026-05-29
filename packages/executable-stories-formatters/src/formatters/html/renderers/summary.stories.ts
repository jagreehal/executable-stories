import type { Meta, StoryObj } from '@storybook/html';
import { renderSummary } from './summary';

const meta: Meta = { title: 'Layout/Summary' };
export default meta;

export const AllPassed: StoryObj = {
  render: () =>
    renderSummary({ total: 25, passed: 25, failed: 0, skipped: 0 }, {}),
};

export const Mixed: StoryObj = {
  render: () =>
    renderSummary({ total: 25, passed: 18, failed: 4, skipped: 3 }, {}),
};

export const AllFailed: StoryObj = {
  render: () =>
    renderSummary({ total: 10, passed: 0, failed: 10, skipped: 0 }, {}),
};
