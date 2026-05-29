import type { Meta, StoryObj } from '@storybook/html';
import type { TestStatus } from '../../../types/test-result';
import { getStatusIcon } from './status';

const meta: Meta = {
  title: 'Renderers/Status (icons)',
  parameters: {
    docs: {
      description: {
        component: 'All status icons rendered with their status-* CSS classes.',
      },
    },
  },
};
export default meta;

const statuses: TestStatus[] = ['passed', 'failed', 'skipped', 'pending'];

function iconGrid(): string {
  const cells = statuses
    .map(
      (s) =>
        `<div style="display:flex;flex-direction:column;align-items:center;gap:0.5rem;padding:1rem;border:1px solid var(--border);border-radius:var(--radius);min-width:7rem">
          <span class="status-icon status-${s}" style="font-size:1.75rem">${getStatusIcon(s)}</span>
          <code style="font-size:0.8125rem;color:var(--muted-foreground)">${s}</code>
        </div>`,
    )
    .join('');
  return `<div style="display:flex;flex-wrap:wrap;gap:0.75rem">${cells}</div>`;
}

export const AllStatuses: StoryObj = {
  render: () => iconGrid(),
};

export const InStepRows: StoryObj = {
  name: 'Inline with step rows',
  render: () => {
    const rows = statuses
      .map(
        (s) =>
          `<div class="step">
            <span class="step-status status-${s}">${getStatusIcon(s)}</span>
            <span class="step-keyword">Then</span>
            <span class="step-text">the result has status <code>${s}</code></span>
          </div>`,
      )
      .join('');
    return `<div class="steps">${rows}</div>`;
  },
};
