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
import {
  extractStoryboardFrames,
  formatStateValue,
  humanizeSlug,
  isLocalFsPath,
  safeImageUrl,
  type ReportScenario,
  type StoryboardStateCard,
} from "executable-stories-core";

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
 * A state card's thumbnail: either the frame's screenshot ("image") or, for
 * non-UI scenarios that only capture `story.state()`, a compact data card
 * ("data") — label plus a few key/value lines from the snapshot.
 */
export type StateThumbnail =
  | { kind: "image"; src: string; alt?: string }
  | { kind: "data"; label?: string; lines: string[] };

/**
 * Compact one-per-line rendering of a state snapshot: object snapshots show
 * their top-level keys (`total: 42`), anything else is one JSON line. Shared
 * by the /states data-card thumbnails and the journey chapter-end strip.
 */
export function stateValueLines(value: unknown, max = 4): string[] {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    const lines = entries.slice(0, max).map(([k, v]) => `${k}: ${formatStateValue(v, 40)}`);
    if (entries.length > max) lines.push(`… ${entries.length - max} more`);
    return lines;
  }
  return [formatStateValue(value)];
}

/**
 * Thumbnail for a scenario's card: its first storyboard frame. Screenshot wins
 * when browser-renderable (a data URI or a web path — an absolute local
 * filesystem path means asset bundling failed and would 404). Otherwise a
 * state-only frame yields a data-card thumbnail, so non-UI scenarios still
 * appear in the /states catalog with something meaningful on the card.
 */
export function stateThumbnail(scenario: StateScenarioLike): StateThumbnail | undefined {
  const frame = extractStoryboardFrames(scenario)[0];
  if (!frame) return undefined;
  if (frame.screenshot && !isLocalFsPath(frame.screenshot.path)) {
    const src = safeImageUrl(frame.screenshot.path);
    if (src) {
      return { kind: "image", src, ...(frame.screenshot.alt !== undefined && { alt: frame.screenshot.alt }) };
    }
  }
  const card = frame.states[0];
  if (!card) return undefined;
  return { kind: "data", ...(card.label !== undefined && { label: card.label }), lines: stateValueLines(card.value) };
}

/**
 * The final state of each lane at the end of a scenario — the "at the end of
 * this chapter" cards a journey page shows after each member. Per lane, the
 * most recent snapshot across all frames (a lane absent from the literal last
 * frame still counts: the world it described hasn't un-happened). Lane order
 * is first-appearance order; [] when the scenario captures no state.
 */
export function chapterEndStates(scenario: StateScenarioLike): StoryboardStateCard[] {
  const latest = new Map<string, StoryboardStateCard>();
  for (const frame of extractStoryboardFrames(scenario)) {
    for (const card of frame.states) latest.set(card.label ?? "", card);
  }
  return [...latest.values()];
}
