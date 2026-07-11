/**
 * Reporter tests for executable-stories-vitest.
 *
 * Tests the StoryReporter class for correct markdown generation.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import StoryReporter from '../reporter';
import type { StoryMeta } from '../types';

// Mock test module/case structure
interface MockTestResult {
  state: 'passed' | 'failed' | 'skipped' | 'pending';
  duration?: number;
  retryCount?: number;
  errors?: Array<{ message?: string; stack?: string; diff?: string }>;
}

interface MockTestCase {
  meta: () => { story?: StoryMeta };
  result: () => MockTestResult;
}

interface MockTestModule {
  moduleId?: string;
  relativeModuleId?: string;
  children?: {
    allTests: () => MockTestCase[];
  };
}

// Helper to create mock test modules
function createMockTestModule(
  sourceFile: string,
  scenarios: Array<{ meta: StoryMeta; result: MockTestResult }>,
): MockTestModule {
  return {
    moduleId: sourceFile,
    relativeModuleId: sourceFile,
    children: {
      allTests: () =>
        scenarios.map((s) => ({
          meta: () => ({ story: s.meta }),
          result: () => s.result,
        })),
    },
  };
}

// Temp directory for test outputs
const TEMP_DIR = path.join(__dirname, '.test-output');

describe('StoryReporter', () => {
  beforeEach(() => {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  });

  describe('basic markdown generation', () => {
    it('generates markdown with title', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'basic',
        output: { mode: 'aggregated' },
        markdown: { title: 'Test Stories', includeMetadata: false },
      });

      // Simulate onInit
      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'adds two numbers',
            steps: [
              { keyword: 'Given', text: 'two numbers', docs: [] },
              { keyword: 'When', text: 'I add them', docs: [] },
              { keyword: 'Then', text: 'I get the sum', docs: [] },
            ],
            sourceOrder: 0,
          },
          result: { state: 'passed', duration: 10 },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'basic.md');
      expect(fs.existsSync(outputFile)).toBe(true);
      const content = fs.readFileSync(outputFile, 'utf8');

      expect(content).toContain('# Test Stories');
      expect(content).toContain('adds two numbers');
      expect(content).toContain('**Given** two numbers');
      expect(content).toContain('**When** I add them');
      expect(content).toContain('**Then** I get the sum');
    });

    it('includes status icons by default', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'status',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'passing test',
            steps: [{ keyword: 'Given', text: 'something', docs: [] }],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
        {
          meta: {
            scenario: 'failing test',
            steps: [{ keyword: 'Given', text: 'something', docs: [] }],
            sourceOrder: 1,
          },
          result: {
            state: 'failed',
            errors: [{ message: 'expected true to be false' }],
          },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'status.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('✅ passing test');
      expect(content).toContain('❌ failing test');
    });

    it('can disable status icons', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'no-status',
        output: { mode: 'aggregated' },
        markdown: { includeStatusIcons: false, includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'test without icon',
            steps: [{ keyword: 'Given', text: 'something', docs: [] }],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'no-status.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('### test without icon');
      expect(content).not.toContain('✅');
    });
  });

  describe('step styles', () => {
    it('renders bullets style by default', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'bullets',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'test',
            steps: [{ keyword: 'Given', text: 'a step', docs: [] }],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'bullets.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('- **Given** a step');
    });

    it('renders gherkin style when configured', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'gherkin',
        output: { mode: 'aggregated' },
        markdown: { stepStyle: 'gherkin', includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'test',
            steps: [{ keyword: 'Given', text: 'a step', docs: [] }],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'gherkin.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('**Given** a step');
      expect(content).not.toContain('- **Given**');
    });
  });

  describe('tags and tickets', () => {
    it('renders tags', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'tags',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'tagged test',
            steps: [{ keyword: 'Given', text: 'something', docs: [] }],
            tags: ['admin', 'security'],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'tags.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('Tags: `admin`, `security`');
    });

    it('renders tickets without URL template as code', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'tickets',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'ticketed test',
            steps: [{ keyword: 'Given', text: 'something', docs: [] }],
            tickets: [{ id: 'JIRA-123' }],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'tickets.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('Tickets: `JIRA-123`');
    });

    it('renders tickets with URL template as links', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'ticket-links',
        output: { mode: 'aggregated' },
        markdown: {
          ticketUrlTemplate: 'https://jira.example.com/browse/{ticket}',
          includeMetadata: false,
        },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'ticketed test',
            steps: [{ keyword: 'Given', text: 'something', docs: [] }],
            tickets: [{ id: 'JIRA-123' }],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'ticket-links.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain(
        '[JIRA-123](https://jira.example.com/browse/JIRA-123)',
      );
    });
  });

  describe('doc entries', () => {
    it('renders note docs', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'notes',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'test with notes',
            steps: [
              {
                keyword: 'Given',
                text: 'something',
                docs: [
                  { kind: 'note', text: 'Important note', phase: 'runtime' },
                ],
              },
            ],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'notes.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('> Important note');
    });

    it('renders code docs', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'code',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'test with code',
            steps: [
              {
                keyword: 'Given',
                text: 'a JSON payload',
                docs: [
                  {
                    kind: 'code',
                    label: 'Payload',
                    content: '{"key": "value"}',
                    lang: 'json',
                    phase: 'runtime',
                  },
                ],
              },
            ],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'code.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('```json');
      expect(content).toContain('{"key": "value"}');
      expect(content).toContain('```');
    });

    it('renders table docs', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'table',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'test with table',
            steps: [
              {
                keyword: 'Given',
                text: 'users',
                docs: [
                  {
                    kind: 'table',
                    label: 'Users',
                    columns: ['Name', 'Role'],
                    rows: [
                      ['Alice', 'Admin'],
                      ['Bob', 'User'],
                    ],
                    phase: 'runtime',
                  },
                ],
              },
            ],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'table.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('| Name | Role |');
      expect(content).toContain('| Alice | Admin |');
      expect(content).toContain('| Bob | User |');
    });

    it('renders kv docs', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'kv',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'test with kv',
            steps: [
              {
                keyword: 'When',
                text: 'payment processed',
                docs: [
                  {
                    kind: 'kv',
                    label: 'Amount',
                    value: '$99.99',
                    phase: 'runtime',
                  },
                  {
                    kind: 'kv',
                    label: 'Status',
                    value: 'success',
                    phase: 'runtime',
                  },
                ],
              },
            ],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'kv.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('- **Amount:** $99.99');
      expect(content).toContain('- **Status:** success');
    });

    it('renders link docs', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'links',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'test with link',
            docs: [
              {
                kind: 'link',
                label: 'API Docs',
                url: 'https://docs.example.com',
                phase: 'runtime',
              },
            ],
            steps: [{ keyword: 'Given', text: 'API', docs: [] }],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'links.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('[API Docs](https://docs.example.com)');
    });
  });

  describe('sorting', () => {
    it('sorts scenarios by source order by default', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'source-order',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'C test (third in source)',
            steps: [{ keyword: 'Given', text: 'C', docs: [] }],
            sourceOrder: 2,
          },
          result: { state: 'passed' },
        },
        {
          meta: {
            scenario: 'A test (first in source)',
            steps: [{ keyword: 'Given', text: 'A', docs: [] }],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
        {
          meta: {
            scenario: 'B test (second in source)',
            steps: [{ keyword: 'Given', text: 'B', docs: [] }],
            sourceOrder: 1,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'source-order.md');
      const content = fs.readFileSync(outputFile, 'utf8');

      // Find the positions of each test in the output
      const posA = content.indexOf('A test (first in source)');
      const posB = content.indexOf('B test (second in source)');
      const posC = content.indexOf('C test (third in source)');

      // Should be in source order: A, B, C
      expect(posA).toBeLessThan(posB);
      expect(posB).toBeLessThan(posC);
    });

    it('sorts scenarios alphabetically when configured', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'alpha-order',
        output: { mode: 'aggregated' },
        markdown: { sortScenarios: 'alpha', includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'C test',
            steps: [{ keyword: 'Given', text: 'C', docs: [] }],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
        {
          meta: {
            scenario: 'A test',
            steps: [{ keyword: 'Given', text: 'A', docs: [] }],
            sourceOrder: 1,
          },
          result: { state: 'passed' },
        },
        {
          meta: {
            scenario: 'B test',
            steps: [{ keyword: 'Given', text: 'B', docs: [] }],
            sourceOrder: 2,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'alpha-order.md');
      const content = fs.readFileSync(outputFile, 'utf8');

      // Find the positions of each test in the output
      const posA = content.indexOf('A test');
      const posB = content.indexOf('B test');
      const posC = content.indexOf('C test');

      // Should be in alphabetical order: A, B, C
      expect(posA).toBeLessThan(posB);
      expect(posB).toBeLessThan(posC);
    });
  });

  describe('suite path grouping', () => {
    it('groups scenarios by suite path', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'suite-groups',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'test in suite A',
            steps: [{ keyword: 'Given', text: 'A', docs: [] }],
            suitePath: ['Calculator', 'Addition'],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
        {
          meta: {
            scenario: 'test in suite B',
            steps: [{ keyword: 'Given', text: 'B', docs: [] }],
            suitePath: ['Calculator', 'Subtraction'],
            sourceOrder: 1,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'suite-groups.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('Calculator - Addition');
      expect(content).toContain('Calculator - Subtraction');
    });

    it('uses custom suite separator', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'custom-separator',
        output: { mode: 'aggregated' },
        markdown: { suiteSeparator: ' > ', includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'test',
            steps: [{ keyword: 'Given', text: 'something', docs: [] }],
            suitePath: ['Parent', 'Child'],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'custom-separator.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('Parent > Child');
    });
  });

  describe('failure details', () => {
    it('includes failure details for failed tests', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'failure',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'failing test',
            steps: [{ keyword: 'Then', text: 'it fails', docs: [] }],
            sourceOrder: 0,
          },
          result: {
            state: 'failed',
            errors: [
              {
                message: 'Expected 1 to equal 2',
                diff: '- Expected\n+ Received\n\n- 2\n+ 1',
              },
            ],
          },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'failure.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('**Failure**');
      expect(content).toContain('Expected 1 to equal 2');
    });

    it('can disable failure details', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'no-failure',
        output: { mode: 'aggregated' },
        markdown: { includeErrors: false, includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'failing test',
            steps: [{ keyword: 'Then', text: 'it fails', docs: [] }],
            sourceOrder: 0,
          },
          result: {
            state: 'failed',
            errors: [{ message: 'Error message' }],
          },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'no-failure.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).not.toContain('**Failure**');
      expect(content).not.toContain('Error message');
    });
  });

  describe('JSON output', () => {
    it('generates cucumber-json when formats includes cucumber-json', async () => {
      const reporter = new StoryReporter({
        formats: ['cucumber-json'],
        outputDir: TEMP_DIR,
        outputName: 'output',
        output: { mode: 'aggregated' },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'test scenario',
            steps: [{ keyword: 'Given', text: 'something', docs: [] }],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const jsonFile = path.join(TEMP_DIR, 'output.cucumber.json');
      expect(fs.existsSync(jsonFile)).toBe(true);

      const json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      // Cucumber-JSON format has features array with scenarios
      expect(Array.isArray(json)).toBe(true);
      expect(json.length).toBeGreaterThan(0);
      expect(json[0].elements).toBeDefined();
      expect(json[0].elements[0].name).toBe('test scenario');
    });
  });

  describe('planned scenarios (it.todo)', () => {
    // Bodyless it.todo never runs story.init(), so the reporter sees a test
    // with no story meta and mode "todo". These pin the synthesis of planned
    // scenarios and the story-file gate that keeps plain suites out.
    function todoTest(name: string, fullName = name) {
      return {
        name,
        fullName,
        options: { mode: 'todo' },
        meta: () => ({}),
        result: () => ({ state: 'skipped' as const }),
      };
    }

    function storyTest(scenario: string) {
      return {
        options: { mode: 'run' },
        meta: () => ({
          story: {
            scenario,
            steps: [{ keyword: 'Given' as const, text: 'something', docs: [] }],
            sourceOrder: 0,
          },
        }),
        result: () => ({ state: 'passed' as const, duration: 5 }),
      };
    }

    async function runReporter(tests: unknown[], rawName: string) {
      const rawRunPath = path.join(TEMP_DIR, rawName);
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'planned',
        output: { mode: 'aggregated' },
        rawRunPath,
      });
      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);
      const mockModule: MockTestModule = {
        moduleId: 'checkout.story.test.ts',
        children: { allTests: () => tests as ReturnType<MockTestModule['children']['allTests']> },
      } as MockTestModule;
      await reporter.onTestRunEnd(
        [mockModule as unknown as Parameters<typeof reporter.onTestRunEnd>[0][0]],
        [],
        'passed',
      );
      return JSON.parse(fs.readFileSync(rawRunPath, 'utf8'));
    }

    it('emits bodyless it.todo tests as raw "todo" test cases alongside story tests', async () => {
      const raw = await runReporter(
        [storyTest('checkout works'), todoTest('gift cards apply', 'Checkout > gift cards apply')],
        'planned-raw.json',
      );

      expect(raw.testCases).toHaveLength(2);
      const planned = raw.testCases.find(
        (tc: { title: string }) => tc.title === 'gift cards apply',
      );
      expect(planned).toBeDefined();
      expect(planned.status).toBe('todo');
      expect(planned.story.scenario).toBe('gift cards apply');
      expect(planned.story.steps).toEqual([]);
      expect(planned.story.suitePath).toEqual(['Checkout']);
      expect(planned.titlePath).toEqual(['Checkout', 'gift cards apply']);
    });

    it('ignores todos in modules without any story tests', async () => {
      const raw = await runReporter([todoTest('some unrelated todo')], 'planned-none.json');
      expect(raw.testCases).toHaveLength(0);
    });
  });

  describe('empty output handling', () => {
    it('writes file with title when no scenarios in aggregated mode', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'empty',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      // No scenarios
      const mockModule: MockTestModule = {
        moduleId: 'test.ts',
        children: {
          allTests: () => [],
        },
      };

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'empty.md');
      // Aggregated mode writes a file even with no scenarios
      expect(fs.existsSync(outputFile)).toBe(true);
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('# User Stories');
    });
  });

  describe('resilience and metadata', () => {
    it('aggregates coverage across multiple onCoverage callbacks', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'coverage-merged',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false, includeSummaryTable: true },
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      reporter.onCoverage({
        '/a.ts': {
          s: { '1': 1 },
          f: { '1': 1 },
          b: { '1': [1, 1] },
          l: { '1': 1 },
        },
      });
      reporter.onCoverage({
        '/b.ts': {
          s: { '1': 0 },
          f: { '1': 0 },
          b: { '1': [0, 0] },
          l: { '1': 0 },
        },
      });

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'coverage scenario',
            steps: [{ keyword: 'Given', text: 'something', docs: [] }],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'coverage-merged.md');
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('| Statements | 50% |');
      expect(content).toContain('| Branches | 50% |');
      expect(content).toContain('| Functions | 50% |');
      expect(content).toContain('| Lines | 50% |');
    });

    it('continues report generation when rawRunPath write fails', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'raw-run-write-fail',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
        rawRunPath: '/dev/null/raw-run.json',
      });

      reporter.onInit({
        config: { root: process.cwd() },
      } as unknown as Parameters<typeof reporter.onInit>[0]);

      const mockModule = createMockTestModule('test.story.test.ts', [
        {
          meta: {
            scenario: 'still generates reports',
            steps: [{ keyword: 'Given', text: 'something', docs: [] }],
            sourceOrder: 0,
          },
          result: { state: 'passed' },
        },
      ]);

      await reporter.onTestRunEnd(
        [
          mockModule as unknown as Parameters<
            typeof reporter.onTestRunEnd
          >[0][0],
        ],
        [],
        'passed',
      );

      const outputFile = path.join(TEMP_DIR, 'raw-run-write-fail.md');
      expect(fs.existsSync(outputFile)).toBe(true);
    });

    it('maps retries from vitest test metadata when available', () => {
      const reporter = new StoryReporter({});
      const storyMeta: StoryMeta = {
        scenario: 'retry scenario',
        steps: [{ keyword: 'Given', text: 'a step', docs: [] }],
        sourceOrder: 0,
      };

      const mockModule: MockTestModule = {
        moduleId: 'retry.story.test.ts',
        children: {
          allTests: () => [
            {
              meta: () => ({ story: storyMeta }),
              result: () => ({ state: 'passed', retryCount: 1 }),
              options: { retry: 3 },
            } as unknown as MockTestCase,
          ],
        },
      };

      const testCases = (
        reporter as unknown as {
          collectTestCases: (
            modules: ReadonlyArray<MockTestModule>,
            root: string,
          ) => Array<{ retry: number; retries: number }>;
        }
      ).collectTestCases([mockModule], process.cwd());

      expect(testCases[0].retry).toBe(1);
      expect(testCases[0].retries).toBe(3);
    });
  });

  describe('otel spans ingestion', () => {
    it('keeps valid spans even when the first entry is invalid', () => {
      const reporter = new StoryReporter({});
      const storyMeta: StoryMeta = {
        scenario: 'trace scenario',
        steps: [{ keyword: 'Given', text: 'a step', docs: [] }],
        sourceOrder: 0,
      };

      const mockModule: MockTestModule = {
        moduleId: 'trace.story.test.ts',
        children: {
          allTests: () => [
            {
              meta: () => ({
                story: storyMeta,
                otelSpans: [
                  null,
                  {
                    spanId: 'span-1',
                    name: 'valid-span',
                    startTimeMs: 0,
                    durationMs: 10,
                    status: 'ok',
                  },
                ],
              }),
              result: () => ({ state: 'passed' }),
            },
          ],
        },
      };

      const testCases = (
        reporter as unknown as {
          collectTestCases: (
            modules: ReadonlyArray<MockTestModule>,
            root: string,
          ) => Array<{ story: StoryMeta }>;
        }
      ).collectTestCases([mockModule], process.cwd());

      expect(testCases[0].story.otelSpans).toBeDefined();
      expect(testCases[0].story.otelSpans).toHaveLength(1);
      expect(testCases[0].story.otelSpans?.[0]?.name).toBe('valid-span');
    });
  });
});
