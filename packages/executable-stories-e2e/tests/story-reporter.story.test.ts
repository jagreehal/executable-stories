import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FinishedRun, Report } from 'e2e';
import type { RawRun } from 'executable-stories-core/types/raw';
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';
import { phraseStep, storyReporter, toRawRun, type Marker } from '../src/index';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(
  HERE,
  '../node_modules/executable-stories-formatters/dist/cli.js',
);

/** A valid report-1 document from the e2e schema fixtures. */
const T0 = Date.parse('2026-07-24T12:00:00.000Z');

const fixture = JSON.parse(
  readFileSync(join(HERE, 'fixtures/report-v1.valid.json'), 'utf8'),
) as Report;

type Result = Report['run']['results'][number];
type Step = Result['attempts'][number]['steps'][number];

function step(
  index: number,
  kind: Step['kind'],
  api: string,
  label: string,
  status: Step['status'] = 'passed',
): Step {
  return {
    id: `attempt-c:${index}`,
    index,
    kind,
    api,
    label,
    source: { file: 'tests/checkout.e2e.ts', line: 10 + index, column: 3 },
    status,
    startedAt: new Date(T0 + index * 100).toISOString(),
    durationMs: 100,
    events: [],
    artifacts: index === 4 ? ['attempt-c:artifact:0'] : [],
  };
}

/** A web test under a describe: app, locator, assertion and agent steps, a screenshot and a trace, retried once. */
const checkout: Result = {
  ...fixture.run.results[0]!,
  id: 'cccc',
  testId: 'tests/checkout.e2e.ts::Checkout%20%3E%20pays%20by%20card',
  tags: ['payments'],
  titlePath: ['Checkout', 'pays by card'],
  file: 'tests/checkout.e2e.ts',
  source: { file: 'tests/checkout.e2e.ts', line: 7, column: 1 },
  status: 'timed-out',
  attempts: [
    {
      ...fixture.run.results[0]!.attempts[0]!,
      id: 'attempt-a',
      status: 'failed',
    },
    {
      id: 'attempt-c',
      index: 1,
      status: 'timed-out',
      startedAt: '2026-07-24T12:00:00.000Z',
      durationMs: 900,
      steps: [
        step(0, 'app', 'app.open', ''),
        step(1, 'agent', 'agent.act', 'add the shoes to the cart'),
        step(2, 'locator', 'locator.click', 'getByRole("button", name: "Pay")'),
        step(
          3,
          'assertion',
          'expect.toHaveText',
          'getByRole("status")',
          'failed',
        ),
        step(4, 'agent', 'agent.assert', 'the receipt is shown', 'timed-out'),
      ],
      artifacts: [
        {
          id: 'attempt-c:artifact:0',
          kind: 'screenshot',
          mediaType: 'image/png',
          path: 'web/checkout/attempt-1/screenshot.png',
          size: 42,
          redaction: 'complete',
          producer: { kind: 'step', stepId: 'attempt-c:4' },
        },
        {
          id: 'attempt-c:artifact:1',
          kind: 'trace',
          mediaType: 'application/zip',
          path: 'web/checkout/attempt-1/trace/trace.zip',
          redaction: 'complete',
          producer: { kind: 'attempt' },
        },
      ],
      secondaryErrors: [],
      cleanup: 'complete',
      error: {
        category: 'test',
        code: 'ASSERTION_FAILED',
        message: 'expect.toHaveText failed',
        retryable: false,
        details: { expected: 'text "Paid"', observed: 'text "Pending"' },
      },
    },
  ],
};

const report: Report = {
  ...fixture,
  run: { ...fixture.run, results: [...fixture.run.results, checkout] },
};

describe('e2e report-1 to RawRun', () => {
  it('maps each test result to a scenario with keyworded steps', ({ task }) => {
    story.init(task);
    story.given('an e2e report with a describe-nested web test');
    const raw = toRawRun({
      report,
      projectRoot: '/project',
      artifactsRoot: '/project/.e2e/artifacts',
    });
    const tc = raw.testCases.find((t) => t.externalId === 'cccc')!;

    story.then('the describe becomes the suite path and the tags carry over');
    expect(tc.story).toMatchObject({
      scenario: 'pays by card',
      suitePath: ['Checkout'],
      tags: ['payments'],
    });
    expect(tc.sourceFile).toBe('tests/checkout.e2e.ts');

    story.and(
      'app steps arrange, actions act, assertions claim, repeats read as And',
    );
    expect(tc.story!.steps.map((s) => `${s.keyword} ${s.text}`)).toEqual([
      'Given open the app',
      'When add the shoes to the cart',
      'And click the "Pay" button',
      'Then the status shows the expected text',
      'And the receipt is shown',
    ]);

    story.and(
      'only claim steps that reached a verdict carry an assertion count',
    );
    expect(tc.story!.steps.map((s) => s.assertions)).toEqual([
      undefined,
      undefined,
      undefined,
      1,
      undefined,
    ]);
  });

  it('phrases locator and expect steps in plain words and keeps other shapes as recorded', ({
    task,
  }) => {
    story.init(task);
    story.given('the step records e2e writes for non-agent steps');
    const cases: [api: string, label: string, text: string][] = [
      ['app.open', '/settings', 'open /settings'],
      [
        'locator.click',
        'getByRole("button", name: "Increment")',
        'click the "Increment" button',
      ],
      ['locator.fill', 'getByLabel("Email")', 'fill in the "Email" field'],
      [
        'locator.fill',
        'getByRole("textbox", name: "Search")',
        'fill in the "Search" field',
      ],
      [
        'locator.waitFor',
        'getByText("Saved") → visible',
        'wait until the text "Saved" is visible',
      ],
      [
        'expect.toBeVisible',
        'getByRole("heading", name: "Pro")',
        'the "Pro" heading is visible',
      ],
      [
        'expect.not.toBeVisible',
        'getByTestId("spinner")',
        'the "spinner" element is not visible',
      ],
      [
        'locator.click',
        'getByRole("row").filter({ hasText: "Ada" })',
        'locator.click getByRole("row").filter({ hasText: "Ada" })',
      ],
      [
        'locator.click',
        'getByRole("link", name: /docs/i)',
        'locator.click getByRole("link", name: /docs/i)',
      ],
      ['screen.tapAt', '120,40', 'screen.tapAt 120,40'],
    ];
    story.then('each reads as words, and anything else stays as recorded');
    for (const [api, label, text] of cases)
      expect(phraseStep(api, label)).toBe(text);
  });

  it('groups e2e steps under the story markers the test called', ({ task }) => {
    story.init(task);
    story.given('a test that marked its steps with story.given/when/then');
    const file = '/project/tests/checkout.e2e.ts';
    const at = (ms: number): number => T0 + ms;
    const markers: Marker[] = [
      {
        keyword: 'Given',
        text: 'a shopper on the store',
        file,
        line: 9,
        at: at(0),
      },
      {
        keyword: 'When',
        text: 'they pay for the shoes',
        file,
        line: 11,
        at: at(50),
      },
      {
        keyword: 'Then',
        text: 'the order is paid',
        file,
        line: 13,
        at: at(250),
      },
      // another test's marker in the same file, and a marker from another file
      { keyword: 'Given', text: 'not this test', file, line: 3, at: at(60) },
      {
        keyword: 'Given',
        text: 'not this file',
        file: '/project/tests/other.e2e.ts',
        line: 10,
        at: at(60),
      },
    ];

    story.when('the reporter maps the run');
    const raw = toRawRun({
      report,
      projectRoot: '/project',
      artifactsRoot: '/a',
      markers,
    });
    const tc = raw.testCases.find((t) => t.externalId === 'cccc')!;

    story.then(
      'each marker becomes a step over the e2e steps that ran after it',
    );
    expect(tc.story!.steps.map((s) => `${s.keyword} ${s.text}`)).toEqual([
      'Given a shopper on the store',
      'When they pay for the shoes',
      'Then the order is paid',
    ]);
    expect(tc.story!.steps[1]!.docs).toEqual([
      { kind: 'note', text: 'add the shoes to the cart', phase: 'runtime' },
      { kind: 'note', text: 'click the "Pay" button', phase: 'runtime' },
    ]);

    story.and('a marker counts the claims under it and takes the worst status');
    expect(tc.story!.steps.map((s) => s.assertions)).toEqual([
      undefined,
      undefined,
      1,
    ]);
    expect(tc.stepEvents!.map((e) => e.status)).toEqual([
      'pass',
      'pass',
      'fail',
    ]);

    story.and('artifacts pin to the marker step that holds their e2e step');
    expect(tc.attachments![0]).toMatchObject({
      name: 'screenshot',
      stepIndex: 2,
    });
  });

  it("finds a serial member's markers in the member's own time window", ({
    task,
  }) => {
    story.init(task);
    story.given(
      'a serial group whose second member starts five seconds after the group',
    );
    const file = 'tests/serial.e2e.ts';
    const member = (id: string, line: number): Result => ({
      ...fixture.run.results[0]!,
      id,
      testId: `${file}::${id}`,
      titlePath: [id],
      file,
      source: { file, line, column: 1 },
      serialGroupId: 'g1',
      attempts: [],
      status: 'passed',
    });
    const groupStep = (id: string, startMs: number, label: string): Step => ({
      ...step(0, 'assertion', 'expect.toBeVisible', label),
      id,
      source: { file, line: 0, column: 1 },
      startedAt: new Date(T0 + startMs).toISOString(),
    });
    const group = {
      id: 'g1',
      attempts: [
        {
          id: 'g1:0',
          index: 0,
          status: 'passed',
          startedAt: new Date(T0).toISOString(),
          durationMs: 7000,
          artifacts: [],
          secondaryErrors: [],
          cleanup: 'complete',
          members: [
            {
              id: 'm0',
              index: 0,
              testId: `${file}::first`,
              status: 'passed',
              startedAt: new Date(T0).toISOString(),
              durationMs: 1000,
              steps: [groupStep('s0', 10, 'getByText("One")')],
              secondaryErrors: [],
            },
            {
              id: 'm1',
              index: 1,
              testId: `${file}::second`,
              status: 'passed',
              startedAt: new Date(T0 + 5000).toISOString(),
              durationMs: 1000,
              steps: [groupStep('s1', 5010, 'getByText("Two")')],
              secondaryErrors: [],
            },
          ],
        },
      ],
    } as unknown as Report['run']['serialGroups'][number];
    const serialReport: Report = {
      ...fixture,
      run: {
        ...fixture.run,
        results: [member('first', 10), member('second', 20)],
        serialGroups: [group],
      },
    };
    const markers: Marker[] = [
      {
        keyword: 'Then',
        text: 'the second page shows Two',
        file: `/project/${file}`,
        line: 21,
        at: T0 + 5005,
      },
    ];

    story.when('the reporter maps the run');
    const raw = toRawRun({
      report: serialReport,
      projectRoot: '/project',
      artifactsRoot: '/a',
      markers,
    });

    story.then('the second member keeps its marker');
    expect(raw.testCases[1]!.story!.steps.map((s) => s.text)).toEqual([
      'the second page shows Two',
    ]);
  });

  it('orders a marker and a step that share a millisecond by source position', ({
    task,
  }) => {
    story.init(task);
    story.given(
      'Given, an action, Then and an assertion all inside one millisecond',
    );
    const file = 'tests/fast.e2e.ts';
    const fast = (
      index: number,
      kind: Step['kind'],
      api: string,
      label: string,
      line: number,
      column = 3,
      status: Step['status'] = 'passed',
    ): Step => ({
      ...step(index, kind, api, label, status),
      source: { file, line, column },
      startedAt: new Date(T0).toISOString(),
    });
    const result: Result = {
      ...fixture.run.results[0]!,
      id: 'fast',
      titlePath: ['fast'],
      file,
      source: { file, line: 1, column: 1 },
      attempts: [
        {
          ...fixture.run.results[0]!.attempts[0]!,
          startedAt: new Date(T0).toISOString(),
          durationMs: 1,
          steps: [
            fast(0, 'app', 'app.open', '/', 3),
            // `story.then('it greets the user'); await expect(...)` on one line
            fast(
              1,
              'assertion',
              'expect.toBeVisible',
              'getByText("Hi")',
              5,
              46,
              'failed',
            ),
          ],
        },
      ],
    };
    const markers: Marker[] = [
      {
        keyword: 'Given',
        text: 'the page is open',
        file: `/project/${file}`,
        line: 2,
        column: 5,
        at: T0,
      },
      {
        keyword: 'Then',
        text: 'it greets the user',
        file: `/project/${file}`,
        line: 5,
        column: 11,
        at: T0,
      },
    ];

    story.when('the reporter maps the run');
    const raw = toRawRun({
      report: { ...fixture, run: { ...fixture.run, results: [result] } },
      projectRoot: '/project',
      artifactsRoot: '/a',
      markers,
    });

    story.then(
      'each step lands under the marker written before it, even on the same line',
    );
    const tc = raw.testCases[0]!;
    expect(
      tc.story!.steps.map((s) =>
        s.docs?.map((d) => (d.kind === 'note' ? d.text : '')),
      ),
    ).toEqual([['open /'], ['the text "Hi" is visible']]);
    expect(tc.stepEvents!.map((e) => e.status)).toEqual(['pass', 'fail']);
  });

  it('omits the assertion count of a marker with no recorded claim', ({
    task,
  }) => {
    story.init(task);
    story.given(
      'a Then marker whose check is a plain value matcher, which e2e does not record as a step',
    );
    const file = 'tests/value.e2e.ts';
    const result: Result = {
      ...fixture.run.results[0]!,
      id: 'value',
      titlePath: ['value'],
      file,
      source: { file, line: 1, column: 1 },
      attempts: [
        {
          ...fixture.run.results[0]!.attempts[0]!,
          startedAt: new Date(T0).toISOString(),
          durationMs: 100,
          steps: [
            {
              ...step(0, 'app', 'app.open', '/'),
              source: { file, line: 3, column: 3 },
            },
          ],
        },
      ],
    };
    const markers: Marker[] = [
      {
        keyword: 'Given',
        text: 'the page is open',
        file: `/project/${file}`,
        line: 2,
        column: 5,
        at: T0,
      },
      {
        keyword: 'Then',
        text: 'two is two',
        file: `/project/${file}`,
        line: 4,
        at: T0 + 50,
      },
    ];

    story.when('the reporter maps the run');
    const raw = toRawRun({
      report: { ...fixture, run: { ...fixture.run, results: [result] } },
      projectRoot: '/project',
      artifactsRoot: '/a',
      markers,
    });

    story.then('the count is absent: a plain value matcher records no step');
    expect(raw.testCases[0]!.story!.steps.map((s) => s.assertions)).toEqual([
      undefined,
      undefined,
    ]);
  });

  it('adds the agent explanation as a note, unless it repeats the error', ({
    task,
  }) => {
    story.init(task);
    story.given('an act the agent explained and an assert that failed');
    const why = 'Pressed Increment twice; the counter read 2.';
    const denial = 'No button labelled Decrement is on the page.';
    const result: Result = {
      ...fixture.run.results[0]!,
      id: 'explained',
      titlePath: ['explained'],
      attempts: [
        {
          ...fixture.run.results[0]!.attempts[0]!,
          steps: [
            {
              ...step(0, 'agent', 'agent.act', 'press Increment twice'),
              explanation: why,
            },
            {
              ...step(
                1,
                'agent',
                'agent.assert',
                'there is a Decrement button',
                'failed',
              ),
              explanation: denial,
              error: {
                category: 'test',
                code: 'ASSERTION_FAILED',
                message: denial,
                retryable: false,
              },
            },
          ],
        },
      ],
    };

    story.when('the reporter maps the run');
    const raw = toRawRun({
      report: { ...fixture, run: { ...fixture.run, results: [result] } },
      projectRoot: '/project',
      artifactsRoot: '/a',
    });

    story.then(
      'the act carries the explanation and the failed assert does not repeat its error',
    );
    expect(raw.testCases[0]!.story!.steps.map((s) => s.docs)).toEqual([
      [{ kind: 'note', text: `Agent: ${why}`, phase: 'runtime' }],
      undefined,
    ]);
  });

  it('keeps status, the final attempt, failure values and artifacts', ({
    task,
  }) => {
    story.init(task);
    const raw = toRawRun({
      report,
      projectRoot: '/project',
      artifactsRoot: '/project/.e2e/artifacts',
    });
    const byId = new Map(raw.testCases.map((t) => [t.externalId, t]));
    const tc = byId.get('cccc')!;

    story.then('timed-out, passed and skipped results keep their status');
    expect([
      tc.status,
      raw.testCases[0]!.status,
      raw.testCases[1]!.status,
    ]).toEqual(['timeout', 'pass', 'skip']);

    story.and('the final attempt wins and the failed one counts as a retry');
    expect(tc.retry).toBe(1);
    expect(tc.error).toEqual({
      message: 'ASSERTION_FAILED: expect.toHaveText failed',
      expected: 'text "Paid"',
      actual: 'text "Pending"',
    });

    story.and('a screenshot pins to its step and a trace stays on the test');
    expect(tc.attachments).toEqual([
      {
        name: 'screenshot',
        mediaType: 'image/png',
        path: '/project/.e2e/artifacts/web/checkout/attempt-1/screenshot.png',
        fileName: 'screenshot.png',
        byteLength: 42,
        stepIndex: 4,
        stepId: 'step-4',
      },
      {
        name: 'trace',
        mediaType: 'application/zip',
        path: '/project/.e2e/artifacts/web/checkout/attempt-1/trace/trace.zip',
        fileName: 'trace.zip',
      },
    ]);

    story.and('a hosted video with no file becomes a video doc');
    expect(raw.testCases[0]!.story!.docs).toEqual([
      {
        kind: 'video',
        path: 'https://recordings.example.com/sessions/abc/replay.mp4',
        phase: 'runtime',
      },
    ]);
  });

  it('writes raw-run.json that the executable-stories CLI validates and renders', async ({
    task,
  }) => {
    story.init(task);
    story.given('an e2e run finished in a project');
    const projectRoot = mkdtempSync(join(tmpdir(), 'es-e2e-'));
    const run = {
      report,
      status: report.run.status,
      exitCode: 1,
      projectRoot,
      reportPath: join(projectRoot, '.e2e/report.json'),
      artifactsRoot: join(projectRoot, '.e2e/artifacts'),
      aiTracePath: undefined,
    } as FinishedRun;

    story.when('the story reporter handles onRunFinished');
    const rows = await storyReporter().onRunFinished!(
      run,
      new AbortController().signal,
    );
    expect(rows).toEqual([
      { label: 'Stories', text: join('.executable-stories', 'raw-run.json') },
    ]);
    const rawRunPath = join(projectRoot, '.executable-stories/raw-run.json');
    const written = JSON.parse(readFileSync(rawRunPath, 'utf8')) as RawRun & {
      schemaVersion: number;
    };
    expect(written.schemaVersion).toBe(1);

    story.then('the CLI accepts it against the raw-run schema');
    execFileSync(process.execPath, [CLI, 'validate', rawRunPath], {
      cwd: projectRoot,
      stdio: 'pipe',
    });

    story.and('the CLI renders it as markdown');
    const outDir = join(projectRoot, 'reports');
    execFileSync(
      process.execPath,
      [
        CLI,
        'format',
        rawRunPath,
        '--format',
        'markdown',
        '--output-dir',
        outDir,
        '--output-name',
        'index',
      ],
      { cwd: projectRoot, stdio: 'pipe' },
    );
    const md = readFileSync(join(outDir, 'index.md'), 'utf8');
    expect(md).toContain('pays by card');
    expect(md).toContain('the receipt is shown');
    expect(md).toContain('adds shoes to the cart');
  });

  it('skips an explore run instead of replacing the last test run', async ({
    task,
  }) => {
    story.init(task);
    story.given('an e2e explore run, which records findings and no tests');
    const projectRoot = mkdtempSync(join(tmpdir(), 'es-e2e-explore-'));
    const exploreReport: Report = {
      ...fixture,
      run: {
        ...fixture.run,
        results: [],
        explore: {
          goal: 'look around the counter',
          budgets: { maxSteps: 1, timeoutMs: 180000 },
          ended: 'step-limit',
          steps: [],
          findings: [],
        },
      },
    };
    const run = {
      report: exploreReport,
      status: exploreReport.run.status,
      exitCode: 0,
      projectRoot,
      reportPath: join(projectRoot, '.e2e/report.json'),
      artifactsRoot: join(projectRoot, '.e2e/artifacts'),
      aiTracePath: undefined,
    } as FinishedRun;

    story.when('the story reporter handles onRunFinished');
    const rows = await storyReporter().onRunFinished!(
      run,
      new AbortController().signal,
    );

    story.then('it writes nothing and says why');
    expect(rows).toEqual([{ label: 'Stories', text: 'skipped (explore run)' }]);
    expect(
      existsSync(join(projectRoot, '.executable-stories/raw-run.json')),
    ).toBe(false);
  });

  it('skips a run that never reached a test', async ({ task }) => {
    story.init(task);
    story.given('a run whose engine failed before any test ran');
    const projectRoot = mkdtempSync(join(tmpdir(), 'es-e2e-empty-'));
    const emptyReport: Report = {
      ...fixture,
      run: { ...fixture.run, results: [] },
    };
    const run = {
      report: emptyReport,
      status: emptyReport.run.status,
      exitCode: 3,
      projectRoot,
      reportPath: undefined,
      artifactsRoot: join(projectRoot, '.e2e/artifacts'),
      aiTracePath: undefined,
    } as FinishedRun;

    story.when('the story reporter handles onRunFinished');
    const rows = await storyReporter().onRunFinished!(
      run,
      new AbortController().signal,
    );

    story.then('it leaves the last raw-run.json alone and says why');
    expect(rows).toEqual([
      { label: 'Stories', text: 'skipped (no tests ran)' },
    ]);
    expect(
      existsSync(join(projectRoot, '.executable-stories/raw-run.json')),
    ).toBe(false);
  });
});
