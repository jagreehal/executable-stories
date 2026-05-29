import type { Meta, StoryObj } from '@storybook/html';
import { escapeHtml } from '../template';
import { renderDocKv } from './doc-entries';

const deps = {
  escapeHtml,
  syntaxHighlighting: false,
  markdownEnabled: false,
  mermaidEnabled: false,
};
const meta: Meta = { title: 'Doc Entries/Kv' };
export default meta;

export const Simple: StoryObj = {
  render: () =>
    renderDocKv(
      {
        kind: 'kv',
        phase: 'runtime',
        label: 'Environment',
        value: 'production',
      },
      deps,
    ),
};

export const NumericValue: StoryObj = {
  render: () =>
    renderDocKv(
      { kind: 'kv', phase: 'runtime', label: 'Request count', value: 1234 },
      deps,
    ),
};

export const ObjectValue: StoryObj = {
  render: () =>
    renderDocKv(
      {
        kind: 'kv',
        phase: 'runtime',
        label: 'User',
        value: { id: 42, role: 'admin', active: true },
      },
      deps,
    ),
};
