import type { Meta, StoryObj } from '@storybook/html';
import { escapeHtml } from '../template';
import { renderDocMermaid } from './doc-entries';

const meta: Meta = { title: 'Doc Entries/Mermaid' };
export default meta;

const sequence = `sequenceDiagram
    participant U as User
    participant API as API
    participant DB as Database
    U->>API: POST /login
    API->>DB: SELECT user
    DB-->>API: user row
    API-->>U: 200 OK + session`;

const flowchart = `flowchart LR
    A[Start] --> B{Authenticated?}
    B -- yes --> C[Dashboard]
    B -- no --> D[Login]
    D --> B`;

export const SequenceLive: StoryObj = {
  name: 'Sequence diagram (live)',
  render: () =>
    renderDocMermaid(
      { kind: 'mermaid', phase: 'static', title: 'Login flow', code: sequence },
      {
        escapeHtml,
        syntaxHighlighting: false,
        markdownEnabled: false,
        mermaidEnabled: true,
      },
    ),
};

export const FlowchartLive: StoryObj = {
  name: 'Flowchart (live)',
  render: () =>
    renderDocMermaid(
      {
        kind: 'mermaid',
        phase: 'static',
        title: 'Auth routing',
        code: flowchart,
      },
      {
        escapeHtml,
        syntaxHighlighting: false,
        markdownEnabled: false,
        mermaidEnabled: true,
      },
    ),
};

export const SequenceCodeOnly: StoryObj = {
  name: 'Sequence (code-only fallback, mermaid disabled)',
  render: () =>
    renderDocMermaid(
      { kind: 'mermaid', phase: 'static', title: 'Login flow', code: sequence },
      {
        escapeHtml,
        syntaxHighlighting: false,
        markdownEnabled: false,
        mermaidEnabled: false,
      },
    ),
};
