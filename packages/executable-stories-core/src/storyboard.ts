/**
 * Storyboard derivation — turn a scenario's step-attached evidence into an
 * ordered list of frames (Given → When → Then). A frame is a container: the
 * step's screenshot (if any) plus its `story.state()` snapshot cards, so
 * non-UI scenarios get filmstrips too and an e2e step can show the screen
 * alongside what the order record now says.
 *
 * Pure derivation from the StoryReport shapes: the storyboard is never
 * authored separately — it falls out of `story.screenshot()` and
 * `story.state()` calls the test already makes. State cards carry
 * frame-to-frame changes (label-keyed, computed here via state-diff).
 * Consumed by the React `<ReportStoryboard/>` filmstrip (HTML report +
 * Astro story pages).
 */

import { diffStateValues, type StateChange } from "./state-diff.js";
import type {
  ReportDocEntry,
  ReportDocScreenshot,
  ReportDocState,
  ReportScenario,
} from "./types/story-report.js";
import type { StepKeyword } from "./types/story.js";
import type { TestStatus } from "./types/test-result.js";

/** The screenshot half of a frame, when the step captured one. */
export interface StoryboardScreenshot {
  /** Screenshot src as it appears in the report (data URI or bundled path). */
  path: string;
  /** Caption from `story.screenshot({ alt })`, when given. */
  alt?: string;
}

/** One state snapshot card inside a frame. */
export interface StoryboardStateCard {
  /** Entity label ("Basket"); unlabeled cards share the anonymous lane. */
  label?: string;
  /** The raw snapshot as captured by `story.state()`. */
  value: unknown;
  /**
   * Changes vs the previous frame's card with the same label; undefined on
   * a label's first appearance (renderers show the full snapshot instead).
   */
  changes?: StateChange[];
}

/** One filmstrip frame: a step plus the evidence that illustrates it. */
export interface StoryboardFrame {
  /** The step's report id (`<scenarioId>--step-<n>`) — a stable DOM anchor. */
  stepId: string;
  stepIndex: number;
  keyword: StepKeyword;
  /** The step description text — doubles as the frame label. */
  text: string;
  status: TestStatus;
  /** First screenshot attached to the step, when there is one. */
  screenshot?: StoryboardScreenshot;
  /**
   * State cards in lane order: labels keep the position of their first
   * appearance across the whole filmstrip, so "Basket" is always in the
   * same slot frame after frame.
   */
  states: StoryboardStateCard[];
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

/** Depth-first collection of all state docs, in document order. */
function findStates(entries: ReportDocEntry[], out: ReportDocState[] = []): ReportDocState[] {
  for (const entry of entries) {
    if (entry.kind === "state") out.push(entry);
    if (entry.children) findStates(entry.children, out);
  }
  return out;
}

/** Lane key: the label, or the shared anonymous lane for unlabeled states. */
const laneOf = (label: string | undefined): string => label ?? "";

/**
 * Derive storyboard frames from a scenario: a step contributes a frame when
 * it has a screenshot (first one wins) or any `story.state()` docs. When a
 * step captures the same label twice, the last snapshot wins (it is the most
 * recent state). Deterministic and order-preserving. Only `steps` is read,
 * so any scenario-shaped value (ReportScenario, StoryEntryData) works uncast.
 */
export function extractStoryboardFrames(scenario: Pick<ReportScenario, "steps">): StoryboardFrame[] {
  const frames: StoryboardFrame[] = [];
  const laneOrder: string[] = [];
  const previous = new Map<string, unknown>();

  for (const step of scenario.steps) {
    const shot = findScreenshot(step.docEntries);
    const stateDocs = findStates(step.docEntries);
    if (!shot && stateDocs.length === 0) continue;

    // Last snapshot per lane wins within a step.
    const byLane = new Map<string, ReportDocState>();
    for (const doc of stateDocs) {
      const lane = laneOf(doc.label);
      if (!byLane.has(lane) && !laneOrder.includes(lane)) laneOrder.push(lane);
      byLane.set(lane, doc);
    }

    const states: StoryboardStateCard[] = [];
    for (const lane of laneOrder) {
      const doc = byLane.get(lane);
      if (!doc) continue;
      const card: StoryboardStateCard = {
        ...(doc.label !== undefined && { label: doc.label }),
        value: doc.value,
      };
      if (previous.has(lane)) card.changes = diffStateValues(previous.get(lane), doc.value);
      previous.set(lane, doc.value);
      states.push(card);
    }

    frames.push({
      stepId: step.id,
      stepIndex: step.index,
      keyword: step.keyword,
      text: step.text,
      status: step.status,
      ...(shot && { screenshot: { path: shot.path, ...(shot.alt !== undefined && { alt: shot.alt }) } }),
      states,
    });
  }
  return frames;
}
