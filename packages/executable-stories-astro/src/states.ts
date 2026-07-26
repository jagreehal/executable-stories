/**
 * UI-state catalog — pure logic behind the `/states` grid.
 *
 * Scenarios tagged `state:<name>` (state:empty-cart, state:error, ...) are the
 * UI states the product verifiably has. The grid groups scenarios by state and
 * shows each one's first storyboard frame as a thumbnail, so designers browse
 * real, test-verified states instead of a hand-maintained inventory. Viewport
 * variants (`viewport:mobile` / `viewport:desktop` tags) of the same state
 * appear as sibling cards — same state, two layouts, side by side.
 */
import { extractStoryboardFrames, humanizeSlug, isLocalFsPath, safeImageUrl, type ReportScenario } from "executable-stories-core";

/** Scenario shape the states grid needs (StoryEntryData satisfies it). */
export type StateScenarioLike = Pick<ReportScenario, "tags" | "status" | "steps">;

/** One UI state and the scenarios that capture it. */
export interface UiState<T extends StateScenarioLike = StateScenarioLike> {
  /** Slug-safe id from the tag (`state:empty-cart` → "empty-cart"). */
  id: string;
  /** Sentence-cased label ("Empty cart"). */
  label: string;
  scenarios: T[];
}

const STATE_TAG = /^state:([a-z0-9][a-z0-9_-]*)$/i;

/** Parse one `state:<name>` tag; undefined for any other tag. */
export function parseStateTag(tag: string): string | undefined {
  const m = STATE_TAG.exec(tag.trim());
  return m ? m[1]!.toLowerCase() : undefined;
}

/** The scenario's `viewport:<name>` tag value, if any (for the card badge). */
export function viewportOf(scenario: { tags: string[] }): string | undefined {
  for (const tag of scenario.tags) {
    const m = /^viewport:([a-z0-9][a-z0-9_-]*)$/i.exec(tag.trim());
    if (m) return m[1]!.toLowerCase();
  }
  return undefined;
}

/**
 * Group scenarios by their `state:*` tags, first-seen order. A scenario
 * carrying several state tags appears under each (the grid renders links and
 * thumbnails, not full cards, so multi-membership is safe).
 */
export function extractStates<T extends StateScenarioLike>(scenarios: T[]): UiState<T>[] {
  const order: string[] = [];
  const byId = new Map<string, UiState<T>>();
  for (const scenario of scenarios) {
    for (const tag of scenario.tags) {
      const id = parseStateTag(tag);
      if (!id) continue;
      let state = byId.get(id);
      if (!state) {
        state = { id, label: humanizeSlug(id), scenarios: [] };
        byId.set(id, state);
        order.push(id);
      }
      state.scenarios.push(scenario);
    }
  }
  return order.map((id) => byId.get(id)!);
}

/**
 * Thumbnail src for a scenario's card: its first storyboard frame, when that
 * frame is browser-renderable (a data URI or a web path — an absolute local
 * filesystem path means asset bundling failed and would 404, so no thumbnail).
 */
export function stateThumbnail(scenario: StateScenarioLike): { src: string; alt?: string } | undefined {
  const frame = extractStoryboardFrames(scenario)[0];
  if (!frame) return undefined;
  if (isLocalFsPath(frame.path)) return undefined;
  const src = safeImageUrl(frame.path);
  if (!src) return undefined;
  return frame.alt !== undefined ? { src, alt: frame.alt } : { src };
}
