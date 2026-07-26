/**
 * Storyboard derivation — turn a scenario's step-attached screenshots into an
 * ordered list of frames (Given → When → Then, each with its image).
 *
 * Pure derivation from the StoryReport shapes: the storyboard is never
 * authored separately, it falls out of `story.screenshot()` calls the test
 * already makes. Consumed by the React `<ReportStoryboard/>` filmstrip (HTML
 * report + Astro story pages).
 */

import type {
  ReportDocEntry,
  ReportDocScreenshot,
  ReportScenario,
} from "./types/story-report.js";
import type { StepKeyword } from "./types/story.js";
import type { TestStatus } from "./types/test-result.js";

/** One filmstrip frame: a step plus the screenshot that illustrates it. */
export interface StoryboardFrame {
  /** The step's report id (`<scenarioId>--step-<n>`) — a stable DOM anchor. */
  stepId: string;
  stepIndex: number;
  keyword: StepKeyword;
  /** The step description text — doubles as the frame label. */
  text: string;
  status: TestStatus;
  /** Screenshot src as it appears in the report (data URI or bundled path). */
  path: string;
  /** Caption from `story.screenshot({ alt })`, when given. */
  alt?: string;
}

/** Depth-first search for the first screenshot doc (covers grouped docs). */
function findScreenshot(entries: ReportDocEntry[]): ReportDocScreenshot | undefined {
  for (const entry of entries) {
    if (entry.kind === "screenshot") return entry;
    if (entry.children) {
      const nested = findScreenshot(entry.children);
      if (nested) return nested;
    }
  }
  return undefined;
}

/**
 * Derive storyboard frames from a scenario: the first screenshot attached to
 * each step becomes that step's frame; steps without a screenshot contribute
 * no frame. Deterministic and order-preserving. Only `steps` is read, so any
 * scenario-shaped value (ReportScenario, StoryEntryData) works uncast.
 */
export function extractStoryboardFrames(scenario: Pick<ReportScenario, "steps">): StoryboardFrame[] {
  const frames: StoryboardFrame[] = [];
  for (const step of scenario.steps) {
    const shot = findScreenshot(step.docEntries);
    if (!shot) continue;
    frames.push({
      stepId: step.id,
      stepIndex: step.index,
      keyword: step.keyword,
      text: step.text,
      status: step.status,
      path: shot.path,
      ...(shot.alt !== undefined && { alt: shot.alt }),
    });
  }
  return frames;
}
