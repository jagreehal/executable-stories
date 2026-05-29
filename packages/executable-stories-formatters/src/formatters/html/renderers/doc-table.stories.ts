import type { Meta, StoryObj } from '@storybook/html';
import { escapeHtml } from '../template';
import { renderDocTable } from './doc-entries';

const deps = {
  escapeHtml,
  syntaxHighlighting: false,
  markdownEnabled: false,
  mermaidEnabled: false,
};
const meta: Meta = { title: 'Doc Entries/Table' };
export default meta;

export const SmallTable: StoryObj = {
  render: () =>
    renderDocTable(
      {
        kind: 'table',
        phase: 'static',
        label: 'Test Matrix',
        columns: ['Input', 'Expected'],
        rows: [
          ['1 + 2', '3'],
          ['10 + 20', '30'],
        ],
      },
      deps,
    ),
};
