import type { Meta, StoryObj } from '@storybook/html';
import { escapeHtml } from '../template';
import { renderDocLink } from './doc-entries';

const deps = {
  escapeHtml,
  syntaxHighlighting: false,
  markdownEnabled: false,
  mermaidEnabled: false,
};
const meta: Meta = { title: 'Doc Entries/Link' };
export default meta;

export const ApiDocs: StoryObj = {
  render: () =>
    renderDocLink(
      {
        kind: 'link',
        phase: 'static',
        label: 'API Documentation',
        url: 'https://example.com/docs/api',
      },
      deps,
    ),
};

export const TraceLink: StoryObj = {
  render: () =>
    renderDocLink(
      {
        kind: 'link',
        phase: 'runtime',
        label: 'View Trace',
        url: 'https://jaeger.example.com/trace/abc123',
      },
      deps,
    ),
};
