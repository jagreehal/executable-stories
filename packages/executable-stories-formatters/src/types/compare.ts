import type { DocEntry, NormalizedTicket, StoryStep } from "executable-stories-core/types/story";
import type { Attachment, TestCaseResult, TestRunResult, TestStatus } from "executable-stories-core/types/test-result";

export type ScenarioChangeKind =
  | "added"
  | "removed"
  | "renamed"
  | "moved"
  | "regressed"
  | "fixed"
  | "changed"
  | "unchanged";

export interface ScenarioChangeFlags {
  status: boolean;
  steps: boolean;
  docs: boolean;
  tags: boolean;
  tickets: boolean;
  source: boolean;
  duration: boolean;
  attachments: boolean;
  error: boolean;
  titlePath: boolean;
}

export interface ScenarioSnapshot {
  id: string;
  scenario: string;
  sourceFile: string;
  sourceLine: number;
  status: TestStatus;
  durationMs: number;
  tags: string[];
  titlePath: string[];
  steps: StoryStep[];
  docs: DocEntry[];
  tickets: NormalizedTicket[];
  attachments: Attachment[];
  errorMessage?: string;
}

export interface ScenarioDiff {
  kind: ScenarioChangeKind;
  id: string;
  scenario: string;
  sourceFile: string;
  sourceLine: number;
  baseline?: ScenarioSnapshot;
  current?: ScenarioSnapshot;
  flags: ScenarioChangeFlags;
  changedFields: string[];
  durationDeltaMs?: number;
  /** For `renamed`/`moved`: the baseline test-case id this behaviour was matched from. */
  previousId?: string;
  /** For `renamed`/`moved`: match confidence in 0..1 (1 = exact content fingerprint). */
  matchConfidence?: number;
  /** For `renamed`/`moved`: how the baseline/current pair was re-identified. */
  matchedBy?: "fingerprint" | "similarity";
}

export interface RunDiffSummary {
  totalBaseline: number;
  totalCurrent: number;
  added: number;
  removed: number;
  /** Behaviours re-identified across a title change (content preserved). */
  renamed: number;
  /** Behaviours re-identified across a file move (content preserved). */
  moved: number;
  changed: number;
  regressed: number;
  fixed: number;
  unchanged: number;
}

export interface RunDiffResult {
  baseline: TestRunResult;
  current: TestRunResult;
  summary: RunDiffSummary;
  scenarios: ScenarioDiff[];
}

export type CompareFormat = "html" | "markdown";

export interface CompareFormatterOptions {
  title?: string;
}

export function toScenarioSnapshot(tc: TestCaseResult): ScenarioSnapshot {
  return {
    id: tc.id,
    scenario: tc.story.scenario,
    sourceFile: tc.sourceFile,
    sourceLine: tc.sourceLine,
    status: tc.status,
    durationMs: tc.durationMs,
    tags: tc.tags,
    titlePath: tc.titlePath,
    steps: tc.story.steps,
    docs: tc.story.docs ?? [],
    tickets: tc.story.tickets ?? [],
    attachments: tc.attachments,
    errorMessage: tc.errorMessage,
  };
}
