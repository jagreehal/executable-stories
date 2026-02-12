/**
 * Reporter tests for executable-stories-playwright.
 *
 * Tests the StoryReporter class for correct markdown generation.
 * Uses mocked TestCase and TestResult types to test the reporter in isolation.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { expect, test } from '@playwright/test';
import type { StoryMeta } from '../types';
import StoryReporter from '../reporter';

// Mock types that match Playwright's reporter interface
interface MockAnnotation {
  type: string;
  description?: string;
}

interface MockTestCase {
  annotations: MockAnnotation[];
  location?: { file: string; line?: number };
}

interface MockTestResult {
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  errors?: Array<{ message?: string }>;
  duration?: number;
}

// Temp directory for test outputs (using os.tmpdir for ES modules compatibility)
const TEMP_DIR = path.join(os.tmpdir(), 'executable-stories-playwright-tests');

test.describe('StoryReporter', () => {
  test.beforeAll(async () => {
    await fs.promises.mkdir(TEMP_DIR, { recursive: true });
  });

  test.afterAll(async () => {
    await fs.promises.rm(TEMP_DIR, { recursive: true, force: true });
  });

  test.describe('basic markdown generation', () => {
    test('generates markdown with scenarios', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'basic',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      // Mock scenario data
      const meta: StoryMeta = {
        scenario: 'adds two numbers',
        steps: [
          { keyword: 'Given', text: 'two numbers', docs: [] },
          { keyword: 'When', text: 'I add them', docs: [] },
          { keyword: 'Then', text: 'I get the sum', docs: [] },
        ],
      };

      const mockTestCase: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta) },
        ],
        location: { file: 'test.story.spec.ts', line: 10 },
      };

      const mockResult: MockTestResult = { status: 'passed', duration: 10 };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        mockTestCase as unknown as Parameters<typeof reporter.onTestEnd>[0],
        mockResult as unknown as Parameters<typeof reporter.onTestEnd>[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'basic.md');
      expect(fs.existsSync(outputFile)).toBe(true);
      const content = await fs.promises.readFile(outputFile, 'utf8');

      expect(content).toContain('# User Stories');
      expect(content).toContain('adds two numbers');
      expect(content).toContain('**Given** two numbers');
      expect(content).toContain('**When** I add them');
      expect(content).toContain('**Then** I get the sum');
    });

    test('includes status icons by default', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'status-icons',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      const passingMeta: StoryMeta = {
        scenario: 'passing test',
        steps: [{ keyword: 'Given', text: 'something', docs: [] }],
      };

      const failingMeta: StoryMeta = {
        scenario: 'failing test',
        steps: [{ keyword: 'Given', text: 'something', docs: [] }],
      };

      const passingTest: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(passingMeta) },
        ],
        location: { file: 'test.spec.ts', line: 1 },
      };

      const failingTest: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(failingMeta) },
        ],
        location: { file: 'test.spec.ts', line: 10 },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        passingTest as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      reporter.onTestEnd(
        failingTest as unknown as Parameters<typeof reporter.onTestEnd>[0],
        {
          status: 'failed',
          errors: [{ message: 'error' }],
        } as unknown as Parameters<typeof reporter.onTestEnd>[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'status-icons.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');
      expect(content).toContain('✅ passing test');
      expect(content).toContain('❌ failing test');
    });

    test('can disable status icons', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'no-status',
        output: { mode: 'aggregated' },
        markdown: { includeStatusIcons: false, includeMetadata: false },
      });

      const meta: StoryMeta = {
        scenario: 'test without icon',
        steps: [{ keyword: 'Given', text: 'something', docs: [] }],
      };

      const mockTestCase: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta) },
        ],
        location: { file: 'test.spec.ts' },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        mockTestCase as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'no-status.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');
      expect(content).toContain('### test without icon');
      expect(content).not.toContain('✅');
    });
  });

  test.describe('tags and tickets', () => {
    test('renders tags', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'tags',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      const meta: StoryMeta = {
        scenario: 'tagged test',
        steps: [{ keyword: 'Given', text: 'something', docs: [] }],
        tags: ['admin', 'security'],
      };

      const mockTestCase: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta) },
        ],
        location: { file: 'test.spec.ts' },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        mockTestCase as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'tags.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');
      expect(content).toContain('Tags: `admin`, `security`');
    });

    test('renders tickets', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'tickets',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      const meta: StoryMeta = {
        scenario: 'ticketed test',
        steps: [{ keyword: 'Given', text: 'something', docs: [] }],
        tickets: ['JIRA-123', 'JIRA-456'],
      };

      const mockTestCase: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta) },
        ],
        location: { file: 'test.spec.ts' },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        mockTestCase as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'tickets.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');
      expect(content).toContain('Tickets: `JIRA-123`, `JIRA-456`');
    });
  });

  test.describe('doc entries', () => {
    test('renders note docs', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'notes',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      const meta: StoryMeta = {
        scenario: 'test with notes',
        steps: [
          {
            keyword: 'Given',
            text: 'something',
            docs: [{ kind: 'note', text: 'Important note', phase: 'runtime' }],
          },
        ],
      };

      const mockTestCase: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta) },
        ],
        location: { file: 'test.spec.ts' },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        mockTestCase as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'notes.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');
      expect(content).toContain('> Important note');
    });

    test('renders code docs', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'code',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      const meta: StoryMeta = {
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
      };

      const mockTestCase: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta) },
        ],
        location: { file: 'test.spec.ts' },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        mockTestCase as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'code.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');
      expect(content).toContain('```json');
      expect(content).toContain('{"key": "value"}');
      expect(content).toContain('```');
    });

    test('renders table docs', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'table',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      const meta: StoryMeta = {
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
      };

      const mockTestCase: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta) },
        ],
        location: { file: 'test.spec.ts' },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        mockTestCase as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'table.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');
      expect(content).toContain('| Name | Role |');
      expect(content).toContain('| Alice | Admin |');
      expect(content).toContain('| Bob | User |');
    });

    test('renders kv docs', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'kv',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      const meta: StoryMeta = {
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
      };

      const mockTestCase: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta) },
        ],
        location: { file: 'test.spec.ts' },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        mockTestCase as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'kv.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');
      expect(content).toContain('- **Amount:** $99.99');
      expect(content).toContain('- **Status:** success');
    });

    test('renders link docs', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'links',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      const meta: StoryMeta = {
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
      };

      const mockTestCase: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta) },
        ],
        location: { file: 'test.spec.ts' },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        mockTestCase as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'links.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');
      expect(content).toContain('[API Docs](https://docs.example.com)');
    });
  });

  test.describe('suite path grouping', () => {
    test('groups scenarios by suite path', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'suite-groups',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      const meta1: StoryMeta = {
        scenario: 'test in suite A',
        steps: [{ keyword: 'Given', text: 'A', docs: [] }],
        suitePath: ['Calculator', 'Addition'],
      };

      const meta2: StoryMeta = {
        scenario: 'test in suite B',
        steps: [{ keyword: 'Given', text: 'B', docs: [] }],
        suitePath: ['Calculator', 'Subtraction'],
      };

      const test1: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta1) },
        ],
        location: { file: 'test.spec.ts', line: 1 },
      };

      const test2: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta2) },
        ],
        location: { file: 'test.spec.ts', line: 20 },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        test1 as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      reporter.onTestEnd(
        test2 as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'suite-groups.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');
      expect(content).toContain('Calculator - Addition');
      expect(content).toContain('Calculator - Subtraction');
    });

    test('uses custom suite separator', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'custom-separator',
        output: { mode: 'aggregated' },
        markdown: { suiteSeparator: ' > ', includeMetadata: false },
      });

      const meta: StoryMeta = {
        scenario: 'test',
        steps: [{ keyword: 'Given', text: 'something', docs: [] }],
        suitePath: ['Parent', 'Child'],
      };

      const mockTestCase: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta) },
        ],
        location: { file: 'test.spec.ts' },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        mockTestCase as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'custom-separator.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');
      expect(content).toContain('Parent > Child');
    });
  });

  test.describe('failure details', () => {
    test('includes failure details for failed tests', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'failure',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      const meta: StoryMeta = {
        scenario: 'failing test',
        steps: [{ keyword: 'Then', text: 'it fails', docs: [] }],
      };

      const mockTestCase: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta) },
        ],
        location: { file: 'test.spec.ts' },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        mockTestCase as unknown as Parameters<typeof reporter.onTestEnd>[0],
        {
          status: 'failed',
          errors: [{ message: 'Expected 1 to equal 2' }],
        } as unknown as Parameters<typeof reporter.onTestEnd>[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'failure.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');
      expect(content).toContain('**Failure**');
      expect(content).toContain('Expected 1 to equal 2');
    });

    test('can disable failure details', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'no-failure',
        output: { mode: 'aggregated' },
        markdown: { includeErrors: false, includeMetadata: false },
      });

      const meta: StoryMeta = {
        scenario: 'failing test',
        steps: [{ keyword: 'Then', text: 'it fails', docs: [] }],
      };

      const mockTestCase: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta) },
        ],
        location: { file: 'test.spec.ts' },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        mockTestCase as unknown as Parameters<typeof reporter.onTestEnd>[0],
        {
          status: 'failed',
          errors: [{ message: 'Error message' }],
        } as unknown as Parameters<typeof reporter.onTestEnd>[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'no-failure.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');
      expect(content).not.toContain('**Failure**');
      expect(content).not.toContain('Error message');
    });
  });

  test.describe('status variations', () => {
    test('renders skipped status icon', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'skipped',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      const meta: StoryMeta = {
        scenario: 'skipped test',
        steps: [{ keyword: 'Given', text: 'something', docs: [] }],
      };

      const mockTestCase: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta) },
        ],
        location: { file: 'test.spec.ts' },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        mockTestCase as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'skipped' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'skipped.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');
      expect(content).toContain('⏩ skipped test');
    });

    test('renders timedOut status icon', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'timeout',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      const meta: StoryMeta = {
        scenario: 'timed out test',
        steps: [{ keyword: 'Given', text: 'something', docs: [] }],
      };

      const mockTestCase: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta) },
        ],
        location: { file: 'test.spec.ts' },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        mockTestCase as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'timedOut' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'timeout.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');
      // timedOut is mapped to 'fail' status, which uses ❌ icon
      expect(content).toContain('❌ timed out test');
    });

    test('renders interrupted status icon', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'interrupted',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      const meta: StoryMeta = {
        scenario: 'interrupted test',
        steps: [{ keyword: 'Given', text: 'something', docs: [] }],
      };

      const mockTestCase: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(meta) },
        ],
        location: { file: 'test.spec.ts' },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        mockTestCase as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'interrupted' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'interrupted.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');
      // interrupted is mapped to 'fail' status, which uses ❌ icon
      expect(content).toContain('❌ interrupted test');
    });
  });

  test.describe('sorting', () => {
    test('sorts scenarios by source line by default', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'source-order',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      const metaC: StoryMeta = {
        scenario: 'C test (third in source)',
        steps: [{ keyword: 'Given', text: 'C', docs: [] }],
      };

      const metaA: StoryMeta = {
        scenario: 'A test (first in source)',
        steps: [{ keyword: 'Given', text: 'A', docs: [] }],
      };

      const metaB: StoryMeta = {
        scenario: 'B test (second in source)',
        steps: [{ keyword: 'Given', text: 'B', docs: [] }],
      };

      // Add in wrong order to verify sorting
      const testC: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(metaC) },
        ],
        location: { file: 'test.spec.ts', line: 30 },
      };

      const testA: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(metaA) },
        ],
        location: { file: 'test.spec.ts', line: 10 },
      };

      const testB: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(metaB) },
        ],
        location: { file: 'test.spec.ts', line: 20 },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        testC as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      reporter.onTestEnd(
        testA as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      reporter.onTestEnd(
        testB as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'source-order.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');

      // In the colocated file, they should be sorted by source line
      const posA = content.indexOf('A test (first in source)');
      const posB = content.indexOf('B test (second in source)');
      const posC = content.indexOf('C test (third in source)');

      // All should exist
      expect(posA).toBeGreaterThan(-1);
      expect(posB).toBeGreaterThan(-1);
      expect(posC).toBeGreaterThan(-1);
    });

    test('sorts scenarios alphabetically when configured', async () => {
      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'alpha-order',
        output: { mode: 'aggregated' },
        markdown: { sortScenarios: 'alpha', includeMetadata: false },
      });

      const metaC: StoryMeta = {
        scenario: 'C test',
        steps: [{ keyword: 'Given', text: 'C', docs: [] }],
      };

      const metaA: StoryMeta = {
        scenario: 'A test',
        steps: [{ keyword: 'Given', text: 'A', docs: [] }],
      };

      const metaB: StoryMeta = {
        scenario: 'B test',
        steps: [{ keyword: 'Given', text: 'B', docs: [] }],
      };

      const testC: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(metaC) },
        ],
        location: { file: 'test.spec.ts', line: 10 },
      };

      const testA: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(metaA) },
        ],
        location: { file: 'test.spec.ts', line: 20 },
      };

      const testB: MockTestCase = {
        annotations: [
          { type: 'story-meta', description: JSON.stringify(metaB) },
        ],
        location: { file: 'test.spec.ts', line: 30 },
      };

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      reporter.onTestEnd(
        testC as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      reporter.onTestEnd(
        testA as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      reporter.onTestEnd(
        testB as unknown as Parameters<typeof reporter.onTestEnd>[0],
        { status: 'passed' } as unknown as Parameters<
          typeof reporter.onTestEnd
        >[1],
      );
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      const outputFile = path.join(TEMP_DIR, 'alpha-order.md');
      const content = await fs.promises.readFile(outputFile, 'utf8');

      // All should exist
      expect(content).toContain('A test');
      expect(content).toContain('B test');
      expect(content).toContain('C test');
    });
  });

  test.describe('empty output handling', () => {
    test('does not write file when no scenarios', async () => {
      const outputFile = path.join(TEMP_DIR, 'empty.md');

      // Clean up any existing file
      if (fs.existsSync(outputFile)) {
        await fs.promises.unlink(outputFile);
      }

      const reporter = new StoryReporter({
        formats: ['markdown'],
        outputDir: TEMP_DIR,
        outputName: 'empty',
        output: { mode: 'aggregated' },
        markdown: { includeMetadata: false },
      });

      reporter.onBegin({} as Parameters<typeof reporter.onBegin>[0]);
      // No tests added
      await reporter.onEnd({ status: 'passed' } as Parameters<
        typeof reporter.onEnd
      >[0]);

      // Playwright reporter skips writing when there are no stories
      expect(fs.existsSync(outputFile)).toBe(false);
    });
  });
});
