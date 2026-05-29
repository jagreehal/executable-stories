import type { Meta, StoryObj } from '@storybook/html';
import { escapeHtml } from '../template';
import { renderDocSection } from './doc-entries';

const meta: Meta = { title: 'Doc Entries/Section' };
export default meta;

const markdown = `
This scenario verifies the **checkout flow** end-to-end.

Key invariants:

- Cart total matches the sum of line items
- Tax is computed at the destination jurisdiction
- Inventory is decremented atomically with order creation

See [order-service](https://example.com/order-service) for details.
`.trim();

export const PreformattedFallback: StoryObj = {
  name: 'Pre-formatted (markdown disabled)',
  render: () =>
    renderDocSection(
      {
        kind: 'section',
        phase: 'static',
        title: 'Checkout invariants',
        markdown,
      },
      {
        escapeHtml,
        syntaxHighlighting: false,
        markdownEnabled: false,
        mermaidEnabled: false,
      },
    ),
};

export const MarkdownEnabled: StoryObj = {
  name: 'Markdown parsed (data-markdown attribute)',
  render: () =>
    renderDocSection(
      {
        kind: 'section',
        phase: 'static',
        title: 'Checkout invariants',
        markdown,
      },
      {
        escapeHtml,
        syntaxHighlighting: false,
        markdownEnabled: true,
        mermaidEnabled: false,
      },
    ),
};
