/**
 * Comprehensive demonstration of complex data structures in documentation.
 * it() + story.init() + story.note/json/table/code/mermaid/section (options objects).
 */
import { expect, it } from '@jest/globals';
import { story } from 'executable-stories-jest';

// ============================================================================
// Nested JSON Objects
// ============================================================================

it('Deeply nested JSON structures', () => {
  story.init();
  story.note('Demonstrating complex nested JSON in documentation');
  story.json({ label: 'Application Configuration', value: {
    app: {
      name: 'MyApplication',
      version: '2.1.0',
      environment: 'production',
    },
    server: {
      host: 'api.example.com',
      port: 443,
      ssl: {
        enabled: true,
        certificate: '/path/to/cert.pem',
        key: '/path/to/key.pem',
        protocols: ['TLSv1.2', 'TLSv1.3'],
      },
      timeouts: { connection: 30000, read: 60000, write: 60000 },
    },
    database: {
      primary: {
        host: 'db-primary.example.com',
        port: 5432,
        name: 'app_production',
        pool: { min: 5, max: 20, idle: 10000 },
      },
      replica: {
        hosts: ['db-replica-1.example.com', 'db-replica-2.example.com'],
        loadBalancing: 'round-robin',
      },
    },
    cache: {
      provider: 'redis',
      cluster: {
        nodes: [
          { host: 'redis-1.example.com', port: 6379 },
          { host: 'redis-2.example.com', port: 6379 },
          { host: 'redis-3.example.com', port: 6379 },
        ],
      },
      ttl: { default: 3600, session: 86400, static: 604800 },
    },
    features: {
      flags: {
        newUI: true,
        betaFeatures: false,
        experimentalAPI: {
          enabled: true,
          allowedUsers: ['admin', 'beta-tester'],
        },
      },
    },
  } });
  story.given('complex configuration is loaded');
  story.then('nested structures are documented');
  expect(true).toBe(true);
});

it('Arrays of complex objects', () => {
  story.init();
  story.note('Documenting arrays with complex nested structures');
  story.json({ label: 'User Profiles', value: [
    {
      id: 'user-001',
      profile: {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        avatar: 'https://example.com/avatars/alice.jpg',
      },
      permissions: {
        roles: ['admin', 'editor'],
        resources: {
          documents: ['read', 'write', 'delete'],
          users: ['read', 'write'],
          settings: ['read', 'write', 'admin'],
        },
      },
      preferences: {
        theme: 'dark',
        notifications: { email: true, push: true, sms: false },
        language: 'en-US',
      },
    },
    {
      id: 'user-002',
      profile: {
        name: 'Bob Smith',
        email: 'bob@example.com',
        avatar: 'https://example.com/avatars/bob.jpg',
      },
      permissions: {
        roles: ['viewer'],
        resources: { documents: ['read'], users: ['read'], settings: [] },
      },
      preferences: {
        theme: 'light',
        notifications: { email: true, push: false, sms: false },
        language: 'en-GB',
      },
    },
  ] });
  story.given('user profiles are loaded');
  story.then('complex arrays are documented');
  expect(true).toBe(true);
});

// ============================================================================
// Large Tables
// ============================================================================

it('Large data tables', () => {
  story.init();
  story.note('Tables with many rows and columns');
  story.table({
    label: 'API Endpoints Reference',
    columns: ['Method', 'Endpoint', 'Auth', 'Rate Limit', 'Description'],
    rows: [
      ['GET', '/api/v1/users', 'Bearer', '100/min', 'List all users'],
      ['GET', '/api/v1/users/:id', 'Bearer', '200/min', 'Get user by ID'],
      ['POST', '/api/v1/users', 'Bearer', '50/min', 'Create new user'],
      ['PUT', '/api/v1/users/:id', 'Bearer', '50/min', 'Update user'],
      ['DELETE', '/api/v1/users/:id', 'Bearer', '20/min', 'Delete user'],
      ['GET', '/api/v1/orders', 'Bearer', '100/min', 'List all orders'],
      ['GET', '/api/v1/orders/:id', 'Bearer', '200/min', 'Get order by ID'],
      ['POST', '/api/v1/orders', 'Bearer', '30/min', 'Create new order'],
      ['PUT', '/api/v1/orders/:id', 'Bearer', '30/min', 'Update order'],
      ['DELETE', '/api/v1/orders/:id', 'Bearer', '10/min', 'Cancel order'],
      ['GET', '/api/v1/products', 'None', '500/min', 'List products'],
      ['GET', '/api/v1/products/:id', 'None', '1000/min', 'Get product'],
      ['POST', '/api/v1/products', 'Admin', '20/min', 'Create product'],
      ['PUT', '/api/v1/products/:id', 'Admin', '20/min', 'Update product'],
      ['DELETE', '/api/v1/products/:id', 'Admin', '5/min', 'Delete product'],
    ],
  });
  story.table({
    label: 'HTTP Status Codes Reference',
    columns: ['Code', 'Status', 'Category', 'Common Use'],
    rows: [
      ['200', 'OK', 'Success', 'Successful GET/PUT'],
      ['201', 'Created', 'Success', 'Successful POST'],
      ['204', 'No Content', 'Success', 'Successful DELETE'],
      ['400', 'Bad Request', 'Client Error', 'Invalid input'],
      ['401', 'Unauthorized', 'Client Error', 'Auth required'],
      ['403', 'Forbidden', 'Client Error', 'Access denied'],
      ['404', 'Not Found', 'Client Error', 'Resource missing'],
      ['500', 'Internal Error', 'Server Error', 'Server failure'],
    ],
  });
  story.given('API documentation is needed');
  story.then('large tables provide comprehensive reference');
  expect(true).toBe(true);
});

// ============================================================================
// Multiple Code Formats
// ============================================================================

it('SQL code examples', () => {
  story.init();
  story.note('SQL queries in documentation');
  story.code({
    label: 'Complex SELECT Query',
    content: `SELECT u.id, u.name, u.email, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active'
GROUP BY u.id, u.name, u.email;`,
    lang: 'sql',
  });
  story.given('SQL examples are documented');
  story.then('SQL syntax is highlighted');
  expect(true).toBe(true);
});

it('YAML configuration examples', () => {
  story.init();
  story.note('YAML configuration files in documentation');
  story.code({
    label: 'Docker Compose Configuration',
    content: `version: '3.8'
services:
  app:
    build: { context: . }
    ports: ["3000:3000"]
  db:
    image: postgres:15`,
    lang: 'yaml',
  });
  story.given('YAML configs are documented');
  story.then('YAML syntax is highlighted');
  expect(true).toBe(true);
});

it('Shell script examples', () => {
  story.init();
  story.note('Bash scripts and commands in documentation');
  story.code({
    label: 'Deployment Script',
    content: `#!/bin/bash
set -euo pipefail
echo "Deploying..."
npm ci && npm run build && npm test`,
    lang: 'bash',
  });
  story.given('shell scripts are documented');
  story.then('bash syntax is highlighted');
  expect(true).toBe(true);
});

// ============================================================================
// Mermaid Diagrams
// ============================================================================

it('Various Mermaid diagram types', () => {
  story.init();
  story.note('Different types of Mermaid diagrams');
  story.mermaid({
    code: `flowchart TD
    A[Browser] --> B[API Gateway]
    B --> C[Auth Service]
    B --> D[User Service]`,
    title: 'System Architecture',
  });
  story.mermaid({
    code: `sequenceDiagram
    participant U as User
    participant A as API
    U->>A: POST /login
    A-->>U: JWT token`,
    title: 'Authentication Flow',
  });
  story.given('various diagram types are documented');
  story.then('all Mermaid diagram types render');
  expect(true).toBe(true);
});

// ============================================================================
// Complex Metadata with Story Options
// ============================================================================

it('Story with complex metadata structure', () => {
  story.init({
    tags: ['comprehensive', 'documentation', 'complex-data'],
    ticket: ['DOCS-001', 'TECH-456'],
    meta: {
      complexity: 'high',
      estimatedReviewTime: '30min',
      dataFormats: ['json', 'sql', 'yaml', 'bash', 'mermaid'],
      coverage: {
        nestedJson: true,
        largeTables: true,
        codeBlocks: true,
        diagrams: true,
      },
      reviewers: ['tech-writer', 'senior-dev'],
      lastUpdated: '2024-01-15',
    },
  });
  story.note('This story demonstrates complex metadata in story options');
  story.given('story has rich metadata');
  story.when('documentation is generated');
  story.then('metadata is preserved in output');
  expect(true).toBe(true);
});

// ============================================================================
// Combined Complex Documentation
// ============================================================================

it('All complex data types in one story', () => {
  story.init();
  story.note('Comprehensive example combining all complex data documentation');
  story.tag(['comprehensive', 'all-in-one']);
  story.kv({ label: 'Documentation Version', value: '2.0' });
  story.kv({ label: 'Completeness', value: '100%' });
  story.link({ label: 'Full Documentation', url: 'https://docs.example.com' });
  story.json({ label: 'Sample API Response', value: {
    data: {
      users: [{ id: 1, name: 'Test' }],
      pagination: { page: 1, total: 100 },
    },
    meta: { version: '1.0' },
  } });
  story.table({
    label: 'Quick Reference',
    columns: ['Type', 'Example', 'Support'],
    rows: [
      ['JSON', 'Nested objects', 'Full'],
      ['Tables', 'Multi-column', 'Full'],
      ['Code', 'Multiple langs', 'Full'],
      ['Diagrams', 'Mermaid', 'Full'],
    ],
  });
  story.code({
    label: 'Quick Start',
    content: `import { story } from 'executable-stories-jest';
it('My Test', () => {
  story.init();
  story.json({ label: 'Data', value: { key: 'value' } });
});`,
    lang: 'typescript',
  });
  story.mermaid({
    code: `graph LR\n    A[Input] --> B[Process]\n    B --> C[Output]`,
    title: 'Simple Flow',
  });
  story.section({
    title: 'Additional Notes',
    markdown: `This story demonstrates:
- Nested JSON structures
- Large tables
- Multiple code formats
- Various Mermaid diagrams
- Complex metadata`,
  });
  story.given('all documentation types are used');
  story.then('comprehensive documentation is generated');
  expect(true).toBe(true);
});
