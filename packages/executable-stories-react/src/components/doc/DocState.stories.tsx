import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { DocState } from './DocState';

const meta: Meta<typeof DocState> = {
  title: 'Doc/DocState',
  component: DocState,
};
export default meta;

type Story = StoryObj<typeof DocState>;

export const BasketSnapshot: Story = {
  args: {
    entry: {
      kind: 'state',
      phase: 'runtime',
      label: 'Basket after discount',
      value: { subtotal: 120, discount: 36, total: 84, currency: 'GBP' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Basket after discount')).toBeVisible();
    await expect(canvas.getByText(/"total": 84/)).toBeVisible();
  },
};

export const DefaultLabel: Story = {
  args: {
    entry: { kind: 'state', phase: 'runtime', value: ['created', 'paid'] },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('State')).toBeVisible();
  },
};
