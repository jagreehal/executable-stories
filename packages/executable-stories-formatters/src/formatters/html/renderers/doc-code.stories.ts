import type { Meta, StoryObj } from '@storybook/html';
import { escapeHtml } from '../template';
import { renderDocCode } from './doc-entries';

const deps = {
  escapeHtml,
  syntaxHighlighting: true,
  markdownEnabled: false,
  mermaidEnabled: false,
};
const meta: Meta = { title: 'Doc Entries/Code' };
export default meta;

export const TypeScript: StoryObj = {
  render: () =>
    renderDocCode(
      {
        kind: 'code',
        phase: 'runtime',
        lang: 'typescript',
        content: 'const greeting = "hello";\nconsole.log(greeting);',
        label: 'TypeScript Example',
      },
      deps,
    ),
};

export const SQL: StoryObj = {
  render: () =>
    renderDocCode(
      {
        kind: 'code',
        phase: 'runtime',
        lang: 'sql',
        content:
          'SELECT u.name, u.email\nFROM users u\nWHERE u.active = true\nLIMIT 10;',
        label: 'Active Users Query',
      },
      deps,
    ),
};
