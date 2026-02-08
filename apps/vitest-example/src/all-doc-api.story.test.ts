/**
 * Comprehensive demonstration of ALL doc API methods.
 *
 * Doc API methods (all use object parameters):
 * - story.note(text) - Add notes
 * - story.tag(names) - Add tags
 * - story.kv({ label, value }) - Key-value pairs
 * - story.code({ label, content, lang }) - Code blocks
 * - story.json({ label, value }) - JSON objects
 * - story.table({ label, columns, rows }) - Tables
 * - story.link({ label, url }) - Links
 * - story.section({ title, markdown }) - Sections
 * - story.mermaid({ code, title }) - Mermaid diagrams
 * - story.screenshot({ path, alt }) - Screenshots
 * - story.custom({ type, data }) - Custom content
 */
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';

// ============================================================================
// story.note() - Add free-text notes
// ============================================================================

describe('Doc API', () => {
  it('note() adds free-text notes', ({ task }) => {
    story.init(task);

    story.note('This is a simple note about the story');
    story.note('Notes can span multiple lines\nand include line breaks');

    story.given('a precondition with a note');
    story.note('Notes can appear after steps');

    story.when('an action occurs');
    story.note('Note between when and then');

    story.then('verification passes');
    story.note('Final note after assertion');
    expect(true).toBe(true);
  });

  // ============================================================================
  // story.tag() - Add tags for categorization
  // ============================================================================

  it('tag() adds tags for categorization', ({ task }) => {
    story.init(task);

    // Single tag
    story.tag('smoke');

    // Multiple tags via array
    story.tag(['regression', 'critical']);

    story.given('tags are added');
    story.tag('step-level-tag');

    story.then('story has multiple tags for filtering');
    expect(true).toBe(true);
  });

  // ============================================================================
  // story.kv() - Add key-value pairs
  // ============================================================================

  it('kv() adds key-value pairs', ({ task }) => {
    story.init(task);

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

  it('code() adds code blocks with syntax highlighting', ({ task }) => {
    story.init(task);

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
      label: 'SQL Query',
      content: `SELECT users.name, orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id
WHERE orders.total > 100
ORDER BY orders.total DESC;`,
      lang: 'sql',
    });

    story.given('code blocks with different languages');

    story.then('code is syntax highlighted in docs');
    expect(true).toBe(true);
  });

  // ============================================================================
  // story.json() - Add JSON code blocks
  // ============================================================================

  it('json() adds JSON code blocks', ({ task }) => {
    story.init(task);

    story.json({
      label: 'Simple Object',
      value: {
        name: 'test',
        value: 42,
        active: true,
      },
    });

    story.json({
      label: 'Nested Configuration',
      value: {
        database: {
          host: 'localhost',
          port: 5432,
          credentials: {
            username: 'admin',
            password: '****',
          },
        },
        features: ['auth', 'cache', 'logging'],
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

  it('table() adds markdown tables', ({ task }) => {
    story.init(task);

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

  it('link() adds hyperlinks', ({ task }) => {
    story.init(task);

    story.link({
      label: 'Project Documentation',
      url: 'https://example.com/docs',
    });
    story.link({ label: 'API Reference', url: 'https://example.com/api' });
    story.link({
      label: 'Issue Tracker',
      url: 'https://github.com/example/project/issues',
    });

    story.given('links to external resources');

    story.then('links are clickable in docs');
    expect(true).toBe(true);
  });

  // ============================================================================
  // story.section() - Add titled sections with markdown
  // ============================================================================

  it('section() adds titled sections with markdown', ({ task }) => {
    story.init(task);

    story.section({
      title: 'Prerequisites',
      markdown: `Before running this test, ensure:

- Node.js 18+ is installed
- Database is running
- Environment variables are set`,
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

    story.then('sections appear as titled blocks');
    expect(true).toBe(true);
  });

  // ============================================================================
  // story.mermaid() - Add Mermaid diagrams
  // ============================================================================

  it('mermaid() adds Mermaid diagrams', ({ task }) => {
    story.init(task);

    story.mermaid({
      title: 'Flow Diagram',
      code: `graph TD
    A[Start] --> B{Is Valid?}
    B -->|Yes| C[Process]
    B -->|No| D[Error]
    C --> E[End]
    D --> E`,
    });

    story.mermaid({
      title: 'Sequence Diagram',
      code: `sequenceDiagram
    participant U as User
    participant A as API
    participant D as Database

    U->>A: POST /login
    A->>D: Query user
    D-->>A: User data
    A-->>U: JWT token`,
    });

    story.given('mermaid diagrams are defined');

    story.then('diagrams render in documentation');
    expect(true).toBe(true);
  });

  // ============================================================================
  // story.screenshot() - Add screenshot references
  // ============================================================================

  it('screenshot() adds screenshot references', ({ task }) => {
    story.init(task);

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

  it('custom() adds custom content types', ({ task }) => {
    story.init(task);

    story.custom({
      type: 'chart',
      data: {
        type: 'bar',
        data: [10, 20, 30, 40],
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      },
    });

    story.custom({
      type: 'metric',
      data: {
        name: 'Response Time',
        value: 145,
        unit: 'ms',
        threshold: 200,
      },
    });

    story.given('custom content types are added');

    story.then('custom renderers can process them');
    expect(true).toBe(true);
  });

  // ============================================================================
  // Complete Example - All doc APIs together
  // ============================================================================

  it('Complete doc API demonstration', ({ task }) => {
    story.init(task, {
      tags: ['comprehensive', 'documentation', 'example'],
      ticket: 'DOC-001',
    });

    // Story-level documentation (before any step)
    story.note('This story demonstrates all doc API methods in one place');
    story.kv({ label: 'Author', value: 'Documentation Team' });
    story.kv({ label: 'Version', value: '2.0' });
    story.link({
      label: 'Full Documentation',
      url: 'https://example.com/docs/complete',
    });

    story.given('all documentation methods are available');

    story.json({
      label: 'Test Configuration',
      value: {
        environment: 'test',
        features: ['all'],
      },
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
      ],
    });

    story.mermaid({
      title: 'Documentation Flow',
      code: `graph LR
    A[Doc API] --> B[Steps]
    B --> C[Generated MD]`,
    });

    story.then('all methods produce rich documentation');
    expect(true).toBe(true);
  });
});
