import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import {
  MermaidDiagram,
  type MermaidApi,
  type MermaidLoader,
} from './MermaidDiagram';

const meta: Meta<typeof MermaidDiagram> = {
  title: 'Doc/MermaidDiagram',
  component: MermaidDiagram,
};
export default meta;

type Story = StoryObj<typeof MermaidDiagram>;

const load: MermaidLoader = async () =>
  ({
    initialize() {},
    async parse() {
      return true;
    },
    async render() {
      return {
        svg: '<svg viewBox="0 0 160 40"><text x="4" y="24">Cart → Cap → Total</text></svg>',
      };
    },
  }) as unknown as MermaidApi;

export const DrawnWithInjectedLoader: Story = {
  args: {
    entry: {
      kind: 'mermaid',
      phase: 'static',
      title: 'Discount pipeline',
      code: 'flowchart LR\n  Cart --> Cap --> Total',
    },
    load,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole('img', { name: 'Discount pipeline' }),
    ).toBeVisible();
    await expect(canvas.getByText('Cart → Cap → Total')).toBeVisible();
  },
};
