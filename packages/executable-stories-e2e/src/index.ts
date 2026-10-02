/**
 * executable-stories reporter for the `e2e` agentic test runner.
 *
 * The reporter reads the finished `report-1` document and writes the RawRun
 * JSON every other adapter writes. `executable-stories format` takes it from
 * there. Optional `story.given/when/then` markers in a test name the steps in
 * the test's own words; without them, step text is phrased from e2e's record.
 */

import { rmSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { FinishedRun, Report, Reporter, ReporterSummary } from 'e2e';
import type {
  RawAttachment,
  RawRun,
  RawStatus,
  RawStepEvent,
  RawTestCase,
} from 'executable-stories-core/types/raw';
import type {
  DocEntry,
  StepKeyword,
  StoryStep,
} from 'executable-stories-core/types/story';
import { phraseStep } from './phrase';
import { MARKERS_DIR, type Marker } from './story';

export { story, type Marker, type MarkerKeyword } from './story';
export { phraseStep } from './phrase';

type ReportResult = Report['run']['results'][number];
type ReportAttempt = ReportResult['attempts'][number];
type ReportStep = ReportAttempt['steps'][number];
type ReportArtifact = ReportAttempt['artifacts'][number];
type ReportError = NonNullable<ReportAttempt['error']>;

export interface StoryReporterOptions {
  /** Where to write the RawRun JSON, relative to the project root. Default: `.executable-stories/raw-run.json`, where `executable-stories format` looks first. */
  rawRunPath?: string;
}

/**
 * Exhaustive over e2e's unions at compile time, forgiving at run time: a newer
 * e2e may report a kind or status this version has never seen, and its
 * contract says to ignore what you do not know rather than fail the reporter.
 */
function unknownValue<T>(_value: never, fallback: T): T {
  return fallback;
}

function resultStatus(status: ReportResult['status']): RawStatus {
  switch (status) {
    case 'passed':
    case 'flaky': // the final attempt passed; `retry` records the failed ones
      return 'pass';
    case 'failed':
      return 'fail';
    case 'skipped':
      return 'skip';
    case 'timed-out':
      return 'timeout';
    case 'interrupted':
      return 'interrupted';
    default:
      return unknownValue(status, 'unknown');
  }
}

function stepStatus(status: ReportStep['status']): RawStatus {
  switch (status) {
    case 'passed':
      return 'pass';
    // Blocked and timed-out steps stopped the scenario, so they read as fail;
    // the error message keeps e2e's code.
    case 'failed':
    case 'blocked':
    case 'timed-out':
      return 'fail';
    // A cancelled step did not finish, so it reads as not run.
    case 'cancelled':
      return 'skip';
    default:
      return unknownValue(status, 'unknown');
  }
}

/** Arrange, act or assert, by what the step did. Repeats become `And` in {@link toSteps}. */
function primaryKeyword(step: ReportStep): 'Given' | 'When' | 'Then' {
  switch (step.kind) {
    case 'app':
    case 'session':
    case 'resource':
      return 'Given';
    case 'locator':
    case 'screen':
      return 'When';
    case 'assertion':
      return 'Then';
    case 'agent':
      return step.api === 'agent.assert' ? 'Then' : 'When';
    default:
      return unknownValue(step.kind, 'When');
  }
}

/** Agent steps are prose already; the rest are phrased from the API they called on what. */
function stepText(step: ReportStep): string {
  if (step.kind === 'agent' && step.label) return step.label;
  return phraseStep(step.api, step.label);
}

function errorMessage(error: ReportError): string {
  return `${error.code}: ${error.message}`;
}

/**
 * One rendered step: a marker with the e2e steps that ran under it, or a
 * single e2e step when the test has no markers before it.
 */
interface Group {
  keyword: Marker['keyword'];
  text: string;
  marker: boolean;
  children: ReportStep[];
}

function toGroups(
  steps: readonly ReportStep[],
  markers: readonly Marker[],
  projectRoot: string,
): Group[] {
  const groups: Group[] = [];
  let pending = 0;
  let current: Group | undefined;
  // A marker goes before a step that started after it. Timestamps are whole
  // milliseconds, so on a tie the source position decides: a marker written
  // before the step in the same file, on an earlier line or earlier on the
  // same line, came first. Elsewhere, the marker wins.
  const before = (m: Marker, step: ReportStep | undefined): boolean => {
    if (step === undefined) return true;
    const at = Date.parse(step.startedAt);
    if (m.at !== at) return m.at < at;
    if (m.file !== path.resolve(projectRoot, step.source.file)) return true;
    return (
      m.line < step.source.line ||
      (m.line === step.source.line && (m.column ?? 0) < step.source.column)
    );
  };
  const takeMarkersBefore = (step: ReportStep | undefined): void => {
    while (pending < markers.length && before(markers[pending]!, step)) {
      const m = markers[pending++]!;
      current = {
        keyword: m.keyword,
        text: m.text,
        marker: true,
        children: [],
      };
      groups.push(current);
    }
  };
  for (const step of steps) {
    takeMarkersBefore(step);
    if (current) current.children.push(step);
    else
      groups.push({
        keyword: primaryKeyword(step),
        text: stepText(step),
        marker: false,
        children: [step],
      });
  }
  takeMarkersBefore(undefined);
  return groups;
}

/** A step that never reached a verdict (blocked, timed out, cancelled) asserted nothing we can see. */
function isObservedClaim(step: ReportStep): boolean {
  return (
    primaryKeyword(step) === 'Then' &&
    (step.status === 'passed' || step.status === 'failed')
  );
}

function groupStatus(group: Group): RawStatus {
  const statuses = group.children.map((c) => stepStatus(c.status));
  for (const worst of ['fail', 'unknown', 'skip'] as const)
    if (statuses.includes(worst)) return worst;
  return 'pass';
}

/** The agent's explanation, unless the error the report shows already says it. */
function agentExplanation(step: ReportStep): DocEntry[] {
  const why = step.explanation?.trim();
  if (!why || step.error?.message.includes(why)) return [];
  return [{ kind: 'note', text: `Agent: ${why}`, phase: 'runtime' }];
}

function toSteps(groups: readonly Group[]): StoryStep[] {
  const out: StoryStep[] = [];
  groups.forEach((group, index) => {
    const repeat =
      group.keyword !== 'And' &&
      group.keyword !== 'But' &&
      out.some((s) => s.keyword === group.keyword);
    const keyword: StepKeyword = repeat ? 'And' : group.keyword;
    const claims = group.children.filter(isObservedClaim).length;
    // e2e records locator and agent claims as steps. A plain value matcher
    // such as `expect(2).toBe(2)` records none, so a group without a recorded
    // claim leaves the count out.
    const assertions = claims > 0 ? { assertions: claims } : {};
    // A marker lists the e2e steps under it; any step adds the agent's own
    // account of what it did or why it judged a claim true.
    const docs: DocEntry[] = group.children.flatMap((c): DocEntry[] => [
      ...(group.marker
        ? [
            {
              kind: 'note' as const,
              text: stepText(c),
              phase: 'runtime' as const,
            },
          ]
        : []),
      ...agentExplanation(c),
    ]);
    out.push({
      id: `step-${index}`,
      keyword,
      text: group.text,
      durationMs: group.children.reduce((sum, c) => sum + c.durationMs, 0),
      ...assertions,
      ...(docs.length > 0 ? { docs } : {}),
    });
  });
  return out;
}

/**
 * Artifacts become attachments, the shape the Playwright adapter gives
 * screenshots, videos and traces. A step-produced artifact is pinned to its
 * step. A hosted video has a URL and no file, so it becomes a video doc.
 */
function toMedia(
  attempt: {
    artifacts: readonly ReportArtifact[];
    steps: readonly ReportStep[];
  },
  groups: readonly Group[],
  artifactsRoot: string,
): { attachments: RawAttachment[]; docs: DocEntry[] } {
  const attachments: RawAttachment[] = [];
  const docs: DocEntry[] = [];
  for (const artifact of attempt.artifacts) {
    if (artifact.path === undefined) {
      if (
        artifact.kind === 'video' &&
        artifact.url !== undefined &&
        /^https?:\/\//.test(artifact.url)
      ) {
        docs.push({ kind: 'video', path: artifact.url, phase: 'runtime' });
      }
      continue;
    }
    const stepIndex = groups.findIndex((group) =>
      group.children.some(
        (step) =>
          step.artifacts.includes(artifact.id) ||
          (artifact.producer?.kind === 'step' &&
            artifact.producer.stepId === step.id),
      ),
    );
    attachments.push({
      name: artifact.kind,
      mediaType: artifact.mediaType,
      path: path.join(artifactsRoot, artifact.path),
      fileName: path.basename(artifact.path),
      ...(artifact.size !== undefined ? { byteLength: artifact.size } : {}),
      ...(stepIndex >= 0 ? { stepIndex, stepId: `step-${stepIndex}` } : {}),
    });
  }
  return { attachments, docs };
}

/** The final attempt, wherever the report keeps it: a serial member's lives on its group. */
function finalAttempt(
  result: ReportResult,
  report: Report,
): {
  attempt?: Pick<
    ReportAttempt,
    'error' | 'startedAt' | 'durationMs' | 'artifacts' | 'steps'
  >;
  count: number;
} {
  if (result.serialGroupId === undefined) {
    return { attempt: result.attempts.at(-1), count: result.attempts.length };
  }
  const attempts =
    report.run.serialGroups.find((g) => g.id === result.serialGroupId)
      ?.attempts ?? [];
  const last = attempts.at(-1);
  const member = last?.members.find((m) => m.testId === result.testId);
  if (last === undefined) return { count: 0 };
  return {
    attempt: {
      error: member?.error ?? last.error,
      startedAt: member?.startedAt ?? last.startedAt,
      durationMs: member?.durationMs ?? last.durationMs,
      artifacts: last.artifacts,
      steps: member?.steps ?? [],
    },
    count: attempts.length,
  };
}

/**
 * The markers one attempt recorded: called from the test's own file, below its
 * declaration and above the next test's, while the attempt ran.
 */
function markersFor(
  result: ReportResult,
  attempt: Pick<ReportAttempt, 'startedAt' | 'durationMs'> | undefined,
  report: Report,
  markers: readonly Marker[],
  projectRoot: string,
): Marker[] {
  if (attempt === undefined || markers.length === 0) return [];
  const file = path.resolve(projectRoot, result.file);
  const from = result.source.line;
  const to = Math.min(
    ...report.run.results
      .filter((r) => r.file === result.file && r.source.line > from)
      .map((r) => r.source.line),
  );
  const start = Date.parse(attempt.startedAt);
  const end = start + attempt.durationMs + 1000; // slack for clock reads on either side
  return markers
    .filter(
      (m) =>
        m.file === file &&
        m.line >= from &&
        m.line < to &&
        m.at >= start &&
        m.at <= end,
    )
    .sort((a, b) => a.at - b.at);
}

function toTestCase(
  result: ReportResult,
  report: Report,
  artifactsRoot: string,
  markers: readonly Marker[],
  projectRoot: string,
): RawTestCase {
  const scenario = result.titlePath.at(-1) ?? result.testId;
  const suitePath = result.titlePath.slice(0, -1);
  const { attempt, count } = finalAttempt(result, report);
  const steps = attempt?.steps ?? [];
  const groups = toGroups(
    steps,
    markersFor(result, attempt, report, markers, projectRoot),
    projectRoot,
  );
  const { attachments, docs } = toMedia(
    { artifacts: attempt?.artifacts ?? [], steps },
    groups,
    artifactsRoot,
  );
  const error = attempt?.error;
  const details = error?.details;
  const stepEvents: RawStepEvent[] = groups.map((group, index) => {
    const failed = group.children.find((c) => c.error !== undefined);
    return {
      index,
      stepId: `step-${index}`,
      title: group.text,
      status: groupStatus(group),
      durationMs: group.children.reduce((sum, c) => sum + c.durationMs, 0),
      ...(failed?.error ? { errorMessage: errorMessage(failed.error) } : {}),
    };
  });

  return {
    externalId: result.id,
    title: scenario,
    titlePath: [...result.titlePath],
    story: {
      scenario,
      steps: toSteps(groups),
      ...(result.tags.length > 0 ? { tags: [...result.tags] } : {}),
      ...(suitePath.length > 0 ? { suitePath } : {}),
      ...(docs.length > 0 ? { docs } : {}),
    },
    sourceFile: result.file,
    sourceLine: Math.max(1, result.source.line),
    status: resultStatus(result.status),
    durationMs: attempt?.durationMs ?? 0,
    ...(error
      ? {
          error: {
            message: errorMessage(error),
            ...(details?.expected !== undefined
              ? { expected: details.expected }
              : {}),
            ...(details?.observed !== undefined
              ? { actual: details.observed }
              : {}),
          },
        }
      : {}),
    ...(stepEvents.length > 0 ? { stepEvents } : {}),
    ...(attachments.length > 0 ? { attachments } : {}),
    retry: Math.max(0, count - 1),
    projectName: result.targetId,
  };
}

/**
 * Map an e2e `report-1` document to a RawRun. Pure: artifact paths resolve
 * against `artifactsRoot` and nothing is read from disk.
 */
export function toRawRun(args: {
  report: Report;
  projectRoot: string;
  artifactsRoot: string;
  /** Set when the run was `--last-failed`: it then covered only part of the suite. */
  lastRun?: Report;
  /** Step markers the run's tests recorded with `story.given/when/then`. */
  markers?: readonly Marker[];
}): RawRun {
  const { report, projectRoot, artifactsRoot } = args;
  // Unselected results stay out of the docs.
  const results = report.run.results.filter((r) => r.selected !== false);
  const filtered =
    args.lastRun !== undefined || results.length < report.run.results.length;
  return {
    testCases: results.map((r) =>
      toTestCase(r, report, artifactsRoot, args.markers ?? [], projectRoot),
    ),
    startedAtMs: Date.parse(report.run.startedAt),
    finishedAtMs: Date.parse(report.run.finishedAt),
    projectRoot,
    // Only "filtered" is claimed: e2e can narrow a run in ways the report
    // does not record, so "full" (which retires scenarios) is never guessed.
    ...(filtered ? { runScope: 'filtered' as const } : {}),
    coveredSourceFiles: [...new Set(results.map((r) => r.file))].sort(),
    ...(report.run.vcs?.commit ? { gitSha: report.run.vcs.commit } : {}),
  };
}

async function readMarkers(dir: string): Promise<Marker[]> {
  const files = await readdir(dir).catch(() => [] as string[]);
  const markers: Marker[] = [];
  for (const file of files.filter((f) => f.endsWith('.jsonl'))) {
    for (const line of (await readFile(path.join(dir, file), 'utf8')).split(
      '\n',
    )) {
      if (!line) continue;
      try {
        markers.push(JSON.parse(line) as Marker);
      } catch {
        // a worker killed mid-write leaves a torn last line; skip it
      }
    }
  }
  return markers;
}

/** An e2e reporter that writes the run as RawRun JSON for the executable-stories CLI. */
export function storyReporter(options: StoryReporterOptions = {}): Reporter {
  return {
    name: 'executable-stories',
    onEvent(event) {
      // Start each run with an empty markers folder. The delete is small and
      // synchronous, which suits onEvent.
      if (event.type === 'run-started')
        rmSync(path.resolve(event.projectRoot, MARKERS_DIR), {
          recursive: true,
          force: true,
        });
    },
    async onRunFinished(run: FinishedRun): Promise<ReporterSummary> {
      const markersDir = path.resolve(run.projectRoot, MARKERS_DIR);
      // An explore run records findings, which the bug-bash skill turns into
      // scenarios. The last test run's raw-run.json stays as it is.
      if (run.report.run.explore !== undefined) {
        await rm(markersDir, { recursive: true, force: true });
        return [{ label: 'Stories', text: 'skipped (explore run)' }];
      }
      const rawRun = toRawRun({
        report: run.report,
        projectRoot: run.projectRoot,
        artifactsRoot: run.artifactsRoot,
        markers: await readMarkers(markersDir),
        ...(run.lastRun ? { lastRun: run.lastRun } : {}),
      });
      await rm(markersDir, { recursive: true, force: true });
      // A run that reached no test keeps the last test run's raw-run.json.
      if (rawRun.testCases.length === 0) {
        return [{ label: 'Stories', text: 'skipped (no tests ran)' }];
      }
      const target = path.resolve(
        run.projectRoot,
        options.rawRunPath ?? '.executable-stories/raw-run.json',
      );
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(
        target,
        JSON.stringify({ schemaVersion: 1, ...rawRun }, null, 2),
        'utf8',
      );
      return [
        { label: 'Stories', text: path.relative(run.projectRoot, target) },
      ];
    },
  };
}
