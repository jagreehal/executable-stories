/**
 * Comprehensive demonstration of ALL doc API methods (story.note, story.tag, story.kv, etc.).
 * Use test() + story.init(testInfo) + story.* with options objects where applicable.
 */
import { expect, test } from '@playwright/test';
import { story } from 'executable-stories-playwright';

// ============================================================================
// story.note() - Add free-text notes
// ============================================================================

test('doc.note() demonstration', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('This is a simple note about the story');
  story.note('Notes can span multiple lines\nand include line breaks');
  story.given('a precondition with a note');
  story.note('Notes can appear between steps');
  story.when('an action occurs');
  story.note('Final note before assertion');
  story.then('verification passes');
  expect(true).toBe(true);
});

// ============================================================================
// story.tag() - Add tags for categorization
// ============================================================================

test('doc.tag() demonstration', async ({}, testInfo) => {
  story.init(testInfo);
  story.tag('smoke');
  story.tag(['regression', 'critical']);
  story.tag('api');
  story.tag(['doc-api']);
  story.given('tags are added');
  story.then('story has multiple tags for filtering');
  expect(true).toBe(true);
});

// ============================================================================
// story.kv() - Add key-value pairs (options: { label, value })
// ============================================================================

test('doc.kv() demonstration', async ({}, testInfo) => {
  story.init(testInfo);
  story.kv({ label: 'Environment', value: 'test' });
  story.kv({ label: 'Version', value: '1.0.0' });
  story.kv({ label: 'Author', value: 'Test Team' });
  story.kv({ label: 'Priority', value: 'high' });
  story.kv({ label: 'Numeric Value', value: 42 });
  story.kv({ label: 'Boolean Value', value: true });
  story.given('key-value pairs are defined');
  story.kv({ label: 'Step-specific Key', value: 'value after step' });
  story.then('all key-value pairs appear in documentation');
  expect(true).toBe(true);
});

// ============================================================================
// story.code() - Add code blocks with syntax highlighting
// ============================================================================

test('doc.code() demonstration', async ({}, testInfo) => {
  story.init(testInfo);
  story.code({
    label: 'TypeScript Example',
    content: `const greeting: string = "Hello, World!";
console.log(greeting);

function add(a: number, b: number): number {
  return a + b;
}`,
    lang: 'typescript',
  });
  story.code({
    label: 'JavaScript Example',
    content: `const data = { name: "test", value: 42 };
console.log(JSON.stringify(data));`,
    lang: 'javascript',
  });
  story.code({
    label: 'SQL Query',
    content: `SELECT users.name, orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id
WHERE orders.total > 100
ORDER BY orders.total DESC;`,
    lang: 'sql',
  });
  story.code({
    label: 'Shell Command',
    content: `#!/bin/bash
npm install
npm run build
npm test`,
    lang: 'bash',
  });
  story.given('code blocks with different languages');
  story.then('code is syntax highlighted in docs');
  expect(true).toBe(true);
});

// ============================================================================
// story.json() - Add JSON code blocks
// ============================================================================

test('doc.json() demonstration', async ({}, testInfo) => {
  story.init(testInfo);
  story.json({
    label: 'Simple Object',
    value: { name: 'test', value: 42, active: true },
  });
  story.json({
    label: 'Nested Configuration',
    value: {
      database: {
        host: 'localhost',
        port: 5432,
        credentials: { username: 'admin', password: '****' },
      },
      features: ['auth', 'cache', 'logging'],
      settings: { maxConnections: 100, timeout: 30000 },
    },
  });
  story.json({
    label: 'Array of Items',
    value: [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
      { id: 3, name: 'Item 3' },
    ],
  });
  story.given('JSON objects are documented');
  story.then('JSON is formatted and displayed');
  expect(true).toBe(true);
});

// ============================================================================
// story.table() - Add markdown tables
// ============================================================================

test('doc.table() demonstration', async ({}, testInfo) => {
  story.init(testInfo);
  story.table({
    label: 'Test Results Summary',
    columns: ['Test Suite', 'Status', 'Duration', 'Coverage'],
    rows: [
      ['Unit Tests', 'Passed', '2.3s', '95%'],
      ['Integration Tests', 'Passed', '5.1s', '87%'],
      ['E2E Tests', 'Failed', '12.4s', '72%'],
      ['Performance Tests', 'Skipped', '-', '-'],
    ],
  });
  story.table({
    label: 'Feature Matrix',
    columns: ['Feature', 'Chrome', 'Firefox', 'Safari'],
    rows: [
      ['WebGL', 'Yes', 'Yes', 'Partial'],
      ['WebRTC', 'Yes', 'Yes', 'Yes'],
      ['Service Workers', 'Yes', 'Yes', 'Yes'],
    ],
  });
  story.given('tables are defined');
  story.then('tables render as markdown');
  expect(true).toBe(true);
});

// ============================================================================
// story.link() - Add hyperlinks
// ============================================================================

test('doc.link() demonstration', async ({}, testInfo) => {
  story.init(testInfo);
  story.link({
    label: 'Project Documentation',
    url: 'https://example.com/docs',
  });
  story.link({ label: 'API Reference', url: 'https://example.com/api' });
  story.link({
    label: 'Issue Tracker',
    url: 'https://github.com/example/project/issues',
  });
  story.link({
    label: 'CI/CD Pipeline',
    url: 'https://ci.example.com/pipeline/123',
  });
  story.given('links to external resources');
  story.then('links are clickable in docs');
  expect(true).toBe(true);
});

// ============================================================================
// story.section() - Add titled sections with markdown
// ============================================================================

test('doc.section() demonstration', async ({}, testInfo) => {
  story.init(testInfo);
  story.section({
    title: 'Prerequisites',
    markdown: `Before running this test, ensure:

- Node.js 18+ is installed
- Database is running
- Environment variables are set

\`\`\`bash
export API_KEY=your-key-here
\`\`\``,
  });
  story.section({
    title: 'Expected Behavior',
    markdown: `The system should:

1. Validate user input
2. Process the request
3. Return appropriate response

> **Note:** Error handling is tested separately.`,
  });
  story.given('sections with rich markdown');
  story.then('sections appear as collapsible or titled blocks');
  expect(true).toBe(true);
});

// ============================================================================
// story.mermaid() - Add Mermaid diagrams
// ============================================================================

test('doc.mermaid() demonstration', async ({}, testInfo) => {
  story.init(testInfo);
  story.mermaid({
    code: `graph TD
    A[Start] --> B{Is Valid?}
    B -->|Yes| C[Process]
    B -->|No| D[Error]
    C --> E[End]
    D --> E`,
    title: 'Flow Diagram',
  });
  story.mermaid({
    code: `sequenceDiagram
    participant U as User
    participant A as API
    participant D as Database

    U->>A: POST /login
    A->>D: Query user
    D-->>A: User data
    A-->>U: JWT token`,
    title: 'Sequence Diagram',
  });
  story.mermaid({
    code: `erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"`,
    title: 'Entity Relationship',
  });
  story.given('mermaid diagrams are defined');
  story.then('diagrams render in documentation');
  expect(true).toBe(true);
});

// ============================================================================
// story.screenshot() - Add screenshot references
// ============================================================================

test('doc.screenshot() demonstration', async ({}, testInfo) => {
  story.init(testInfo);
  story.screenshot({
    path: '../screenshots/login-page.png',
    alt: 'Login page screenshot',
  });
  story.screenshot({
    path: '../screenshots/dashboard.png',
    alt: 'Dashboard after login',
  });
  story.given('screenshot paths are recorded');
  story.then('screenshots appear in documentation');
  expect(true).toBe(true);
});

// ============================================================================
// story.custom() - Add custom content types
// ============================================================================

test('doc.custom() demonstration', async ({}, testInfo) => {
  story.init(testInfo);
  story.custom({ type: 'chart', data: {
    type: 'bar',
    data: [10, 20, 30, 40],
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  } });
  story.custom({ type: 'metric', data: {
    name: 'Response Time',
    value: 145,
    unit: 'ms',
    threshold: 200,
  } });
  story.custom({ type: 'badge', data: {
    label: 'Coverage',
    value: '95%',
    color: 'green',
  } });
  story.given('custom content types are added');
  story.then('custom renderers can process them');
  expect(true).toBe(true);
});

// ============================================================================
// Runtime documentation (inline story.note/kv/json between steps)
// ============================================================================

test('Runtime doc.* demonstration', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('Static doc added at registration time');
  story.given('setup with runtime values');
  story.when('action produces runtime data');
  story.then('runtime values appear in docs');
  expect(true).toBe(true);
});

// ============================================================================
// Complete Example - All doc APIs together
// ============================================================================

test('Complete doc API demonstration', async ({}, testInfo) => {
  story.init(testInfo);
  story.note('This story demonstrates all doc API methods in one place');
  story.tag(['comprehensive', 'documentation', 'example']);
  story.kv({ label: 'Author', value: 'Documentation Team' });
  story.kv({ label: 'Version', value: '2.0' });
  story.link({
    label: 'Full Documentation',
    url: 'https://example.com/docs/complete',
  });
  story.given('all documentation methods are available');
  story.json({
    label: 'Test Configuration',
    value: { environment: 'test', features: ['all'] },
  });
  story.when('documentation is generated');
  story.table({
    label: 'API Coverage',
    columns: ['Method', 'Supported', 'Example'],
    rows: [
      ['note()', 'Yes', 'Free text notes'],
      ['tag()', 'Yes', 'Categorization'],
      ['kv()', 'Yes', 'Key-value pairs'],
      ['code()', 'Yes', 'Syntax highlighted code'],
      ['json()', 'Yes', 'JSON objects'],
      ['table()', 'Yes', 'Markdown tables'],
      ['link()', 'Yes', 'Hyperlinks'],
      ['section()', 'Yes', 'Markdown sections'],
      ['mermaid()', 'Yes', 'Diagrams'],
      ['screenshot()', 'Yes', 'Images'],
      ['custom()', 'Yes', 'Custom types'],
      ['runtime.*', 'Yes', 'Runtime values'],
    ],
  });
  story.mermaid({
    code: `graph LR
    A[Doc API] --> B[Static Docs]
    A --> C[Runtime Docs]
    B --> D[Generated MD]
    C --> D`,
    title: 'Documentation Flow',
  });
  story.then('all methods work together');
  expect(true).toBe(true);
});
