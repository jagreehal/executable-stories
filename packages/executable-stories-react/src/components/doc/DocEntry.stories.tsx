import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReportDocEntry } from 'executable-stories-core';
import { expect, within } from 'storybook/test';
import { DocEntry } from './DocEntry';

const meta: Meta<typeof DocEntry> = {
  title: 'Doc/All Entries',
  component: DocEntry,
};
export default meta;

type Story = StoryObj<typeof DocEntry>;

// A 1×1 transparent PNG (as a data URI) so the screenshot <img> has a real,
// non-broken source in isolation. The kitchen-sink report uses a relative path
// that only resolves alongside a generated report.
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP8z8BQDwAFgwJ/lYd9KgAAAABJRU5ErkJggg==';

// One entry of every kind, drawn from the kitchen-sink report shapes. Mermaid
// renders as its static source (no `renderers.mermaid` in context here); HTML
// uses inline content; the screenshot uses an inline PNG so nothing is broken.
const allEntries: ReportDocEntry[] = [
  {
    kind: 'note',
    phase: 'static',
    text: 'Seeded from the standard fixture cart.',
  },
  {
    kind: 'tag',
    phase: 'static',
    names: ['regression-guard', 'finance-approved'],
  },
  {
    kind: 'kv',
    phase: 'static',
    label: 'Gateway response',
    value: { code: 'declined', retriable: false },
  },
  {
    kind: 'code',
    phase: 'static',
    label: 'Pricing call',
    lang: 'ts',
    content: 'const total = applyDiscount(cart, { loyalty: 0.45 });',
  },
  {
    kind: 'table',
    phase: 'static',
    label: 'Discount tiers',
    columns: ['Requested', 'Applied', 'Saving'],
    rows: [
      ['20%', '20%', '$24.00'],
      ['45%', '30%', '$36.00'],
    ],
  },
  {
    kind: 'link',
    phase: 'static',
    label: 'Pricing policy',
    url: 'https://example.com/policy',
  },
  {
    kind: 'section',
    phase: 'static',
    title: 'Why this rule exists',
    markdown:
      'Loyalty stacking used to let a few accounts reach **negative totals**. The cap keeps margins safe.',
  },
  {
    kind: 'mermaid',
    phase: 'static',
    title: 'Discount pipeline',
    code: 'flowchart LR\n  Cart --> Loyalty --> Cap[Cap at 30%] --> Total',
  },
  { kind: 'screenshot', phase: 'static', path: PNG, alt: 'Search result card' },
  {
    kind: 'video',
    phase: 'static',
    path: 'https://example.com/videos/search-demo.webm',
    caption: 'Typing a query and selecting a result',
  },
  {
    kind: 'html',
    phase: 'static',
    title: 'Embedded result card',
    height: 160,
    content:
      '<div style="font-family:system-ui;padding:16px"><strong>Wireless Mouse</strong> — $29.99</div>',
  },
  {
    kind: 'state',
    phase: 'runtime',
    label: 'Basket after discount',
    value: { subtotal: 120, discount: 36, total: 84 },
  },
  {
    kind: 'custom',
    phase: 'static',
    type: 'ranking-debug',
    data: {
      query: 'wireles mouse',
      topScore: 0.94,
      corrected: 'wireless mouse',
    },
  },
];

/** Kitchen-sink: every doc kind stacked, the way a step's docEntries render. */
export const AllKinds: Story = {
  render: () => (
    <div>
      {allEntries.map((entry, i) => (
        <DocEntry key={i} entry={entry} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // A representative element from several distinct kinds is present.
    await expect(
      canvas.getByText('Seeded from the standard fixture cart.'),
    ).toBeVisible(); // note
    await expect(canvas.getByText('Discount tiers')).toBeVisible(); // table
    await expect(
      canvas.getByRole('link', { name: 'Pricing policy' }),
    ).toBeVisible(); // link
    await expect(
      canvas.getByRole('img', { name: 'Search result card' }),
    ).toBeVisible(); // screenshot
    await expect(canvas.getByText(/flowchart LR/)).toBeVisible(); // mermaid source
    await expect(canvas.getByText('ranking-debug')).toBeVisible(); // custom
    await expect(canvas.getByTitle('Embedded result card')).toBeInTheDocument(); // html iframe
    await expect(canvas.getByText('Basket after discount')).toBeVisible(); // state
  },
};
