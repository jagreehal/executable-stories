/**
 * Comprehensive demonstration of ALL story configuration options.
 *
 * Story options: story.init({ tags, ticket, meta })
 * Use describe/it + story.init(options) + story.given/when/then (markers only).
 */
import { expect, it } from '@jest/globals';
import { story } from 'executable-stories-jest';

// ============================================================================
// Tags Option - Categorization and Filtering
// ============================================================================

it('Story with single tag', () => {
  story.init({ tags: ['smoke'] });
  story.note('Single tag for basic categorization');
  story.given('a tagged story');
  story.when('tests are filtered');
  story.then("this story matches the 'smoke' tag");
  expect(true).toBe(true);
});

it('Story with multiple tags', () => {
  story.init({ tags: ['smoke', 'regression', 'critical'] });
  story.note('Multiple tags for flexible filtering');
  story.given('a story with multiple tags');
  story.when('tests are filtered by any tag');
  story.then('this story matches multiple filters');
  expect(true).toBe(true);
});

it('Story with feature tags', () => {
  story.init({ tags: ['feature:auth', 'feature:login'] });
  story.note('Tags can use prefixes for organization');
  story.given('a story tagged by feature');
  story.then('feature filtering is possible');
  expect(true).toBe(true);
});

// ============================================================================
// Ticket Option - Issue/Requirement Tracking
// ============================================================================

it('Story with single ticket', () => {
  story.init({ ticket: 'JIRA-123' });
  story.note('Links story to a single issue tracker ticket');
  story.given('a story linked to JIRA-123');
  story.when('documentation is generated');
  story.then('ticket reference appears in docs');
  expect(true).toBe(true);
});

it('Story with multiple tickets', () => {
  story.init({ ticket: ['JIRA-123', 'JIRA-456', 'JIRA-789'] });
  story.note('Story can be linked to multiple tickets');
  story.given('a story linked to multiple tickets');
  story.when('requirements are tracked');
  story.then('all ticket references are documented');
  expect(true).toBe(true);
});

it('Story with different ticket formats', () => {
  story.init({ ticket: ['JIRA-123', 'GH-456', 'BUG-789'] });
  story.note('Different ticket systems can be referenced');
  story.given('tickets from JIRA, GitHub, and bug tracker');
  story.then('all formats are supported');
  expect(true).toBe(true);
});

// ============================================================================
// Meta Option - Custom Metadata
// ============================================================================

it('Story with simple metadata', () => {
  story.init({
    meta: {
      priority: 'high',
      owner: 'team-backend',
    },
  });
  story.note('Custom metadata attached to story');
  story.given('a story with custom metadata');
  story.then('metadata is available in reports');
  expect(true).toBe(true);
});

it('Story with complex metadata', () => {
  story.init({
    meta: {
      priority: 'critical',
      owner: 'team-frontend',
      sprint: 42,
      epic: 'User Authentication',
      estimatedHours: 8,
      reviewers: ['alice', 'bob', 'charlie'],
      dependencies: ['auth-service', 'user-service'],
      environments: {
        dev: true,
        staging: true,
        production: false,
      },
    },
  });
  story.note('Metadata can contain nested structures and arrays');
  story.given('a story with rich metadata');
  story.when('reports are generated');
  story.then('all metadata is preserved');
  expect(true).toBe(true);
});

// ============================================================================
// Combined Options - All Options Together
// ============================================================================

it('Story with all options combined', () => {
  story.init({
    tags: ['smoke', 'critical', 'feature:checkout'],
    ticket: 'PROJ-456',
    meta: {
      priority: 'high',
      owner: 'team-checkout',
      sprint: 15,
      complexity: 'medium',
    },
  });
  story.note('All story options used together');
  story.given('a fully configured story');
  story.when('documentation is generated');
  story.then('all options appear in output');
  expect(true).toBe(true);
});

it('Complete story configuration example', () => {
  story.init({
    tags: ['api', 'feature:user-management'],
    ticket: ['EPIC-100', 'STORY-201', 'TASK-302'],
    meta: {
      priority: 'high',
      owner: 'api-team',
      sprint: 23,
      points: 5,
      apiVersion: '2.0',
      endpoints: ['/users', '/users/:id', '/users/:id/profile'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      testCoverage: { unit: 95, integration: 80, e2e: 60 },
      environments: ['dev', 'staging', 'production'],
      featureFlags: { newUserFlow: true, betaFeatures: false },
      reviewers: ['senior-dev-1', 'senior-dev-2'],
      approvedBy: 'tech-lead',
      approvedDate: '2024-01-15',
      notes: 'This story covers the complete user management API',
      relatedDocs: ['docs/api/users.md', 'docs/guides/user-management.md'],
    },
  });
  story.note('Comprehensive example with realistic metadata');
  story.tag('documentation-example');
  story.given('complete story configuration');
  story.when('documentation is generated');
  story.then('rich metadata enables advanced reporting');
  expect(true).toBe(true);
});

// ============================================================================
// Story Options with doc.* Methods (story.note, story.tag, story.kv, story.table)
// ============================================================================

it('Story options combined with doc API', () => {
  story.init({
    tags: ['api', 'comprehensive'],
    ticket: 'DOC-789',
    meta: { owner: 'docs-team' },
  });
  story.note('Story options and doc API complement each other');
  story.tag('additional-tag');
  story.kv({ label: 'Additional Key', value: 'Additional Value' });
  story.table({
    label: 'Options vs Doc API',
    columns: ['Aspect', 'Story Options', 'Doc API'],
    rows: [
      ['When Set', 'Declaration time', 'Anytime'],
      ['Structure', 'Fixed schema', 'Flexible'],
      ['Use Case', 'Filtering/Reporting', 'Rich docs'],
    ],
  });
  story.given('story with options and doc methods');
  story.when('both are used');
  story.then('they work together seamlessly');
  expect(true).toBe(true);
});

// ============================================================================
// Practical Examples
// ============================================================================

it('Login feature - happy path', () => {
  story.init({
    tags: ['smoke', 'auth', 'login'],
    ticket: 'AUTH-001',
    meta: { priority: 'critical', automationStatus: 'complete' },
  });
  story.given('user is on login page');
  story.when('user enters valid credentials');
  story.then('user is logged in successfully');
  expect(true).toBe(true);
});

it('Login feature - invalid password', () => {
  story.init({
    tags: ['regression', 'auth', 'login', 'negative'],
    ticket: ['AUTH-001', 'AUTH-015'],
    meta: {
      priority: 'high',
      automationStatus: 'complete',
      relatedTo: 'Login feature - happy path',
    },
  });
  story.given('user is on login page');
  story.when('user enters invalid password');
  story.then('error message is displayed');
  expect(true).toBe(true);
});

it('Payment processing', () => {
  story.init({
    tags: ['critical', 'payment', 'checkout'],
    ticket: 'PAY-100',
    meta: {
      priority: 'critical',
      securityReview: true,
      pciCompliance: true,
      testData: { cardType: 'visa', amount: 99.99 },
    },
  });
  story.note('Payment tests require special handling');
  story.given('user has items in cart');
  story.when('user completes payment');
  story.then('payment is processed successfully');
  expect(true).toBe(true);
});

// ============================================================================
// Empty and Minimal Options
// ============================================================================

it('Story with empty tags array', () => {
  story.init({ tags: [] });
  story.given('story with empty tags');
  story.then('story still works');
  expect(true).toBe(true);
});

it('Story with empty meta object', () => {
  story.init({ meta: {} });
  story.given('story with empty meta');
  story.then('story still works');
  expect(true).toBe(true);
});

it('Story with only tags', () => {
  story.init({ tags: ['minimal'] });
  story.given('story with only tags option');
  story.then('other options are optional');
  expect(true).toBe(true);
});

it('Story with only ticket', () => {
  story.init({ ticket: 'MIN-001' });
  story.given('story with only ticket option');
  story.then('other options are optional');
  expect(true).toBe(true);
});

it('Story with only meta', () => {
  story.init({ meta: { key: 'value' } });
  story.given('story with only meta option');
  story.then('other options are optional');
  expect(true).toBe(true);
});
