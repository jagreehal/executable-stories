import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReportDocMermaid } from 'executable-stories-core';
import { expect, waitFor, within } from 'storybook/test';
import {
  MermaidView,
  type MermaidApi,
  type MermaidLoader,
} from './MermaidView';

const meta: Meta<typeof MermaidView> = {
  title: 'Doc/MermaidView',
  component: MermaidView,
};
export default meta;

type Story = StoryObj<typeof MermaidView>;

const entry: ReportDocMermaid = {
  kind: 'mermaid',
  phase: 'static',
  title: 'Discount pipeline',
  code: 'flowchart LR\n  Cart --> Loyalty --> Cap[Cap at 30%] --> Total',
};

// A fake mermaid API injected via `load` — no network, no real `mermaid`
// package. It returns an inline SVG labelled as an image so the drawn-diagram
// branch is exercised and stays axe-clean (role="img" + aria-label on the host).
const fakeLoad: MermaidLoader = async () =>
  ({
    initialize() {},
    async parse() {
      return true;
    },
    async render(_id: string, code: string) {
      return {
        svg: `<svg role="img" aria-label="diagram" width="120" height="40"><text x="4" y="20">${code.slice(0, 20)}</text></svg>`,
      };
    },
  }) as unknown as MermaidApi;

export const Drawn: Story = {
  args: { entry, load: fakeLoad },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // After the effect resolves, the diagram swaps in as a labelled graphic.
    await waitFor(() =>
      expect(
        canvas.getByRole('img', { name: 'Discount pipeline' }),
      ).toBeVisible(),
    );
  },
};

// When the loader rejects, the view falls back to the readable source `<pre>`.
export const FallbackOnLoadError: Story = {
  args: {
    entry,
    load: async () => {
      throw new Error('mermaid unavailable');
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/flowchart LR/)).toBeVisible();
  },
};

// Invalid source names the syntax problem and keeps the readable source visible.
export const SyntaxError: Story = {
  args: {
    entry,
    load: async () =>
      ({
        initialize() {},
        async parse() {
          throw new Error('Unexpected token on line 1');
        },
        async render() {
          throw new Error('render must not run after a parse failure');
        },
      }) as unknown as MermaidApi,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Diagram failed to render: Unexpected token on line 1',
    );
    await expect(canvas.getByText(/flowchart LR/)).toBeVisible();
  },
};
