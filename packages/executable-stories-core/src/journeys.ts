/**
 * Journey derivation — compose ordered scenarios into one user journey
 * ("Guest checkout" = browse → pay → confirmation) from the tag convention
 *
 *   journey:<id>            membership (order = appearance order)
 *   journey:<id>:<n>        membership + explicit position
 *
 * A convention, not a new API: tags already flow through every adapter,
 * formatter, and schema, so journeys work identically for Playwright, Vitest,
 * pytest, Go, ... with zero adapter changes. Pure derivation (like
 * storyboard.ts); consumed by the Astro /journeys pages and <StoryJourney/>.
 */

import type { TestStatus } from "./types/test-result.js";
import { humanizeSlug } from "./utils/humanize.js";

/** Minimal scenario shape journeys derive from (ReportScenario satisfies it). */
export interface JourneyScenarioLike {
  tags: string[];
  status: TestStatus;
}

/** One derived journey: ordered member scenarios plus an aggregate status. */
export interface Journey<T extends JourneyScenarioLike = JourneyScenarioLike> {
  /** Slug-safe id from the tag (`journey:guest-checkout` → "guest-checkout"). */
  id: string;
  /** Sentence-cased title from the id ("Guest checkout"). Override in prose. */
  title: string;
  /**
   * Aggregate status: `failed` if any member failed, `passed` only when ALL
   * members passed, else `pending` (a partially-verified walkthrough must not
   * read green).
   */
  status: TestStatus;
  /** Members ordered by explicit `:n` position, then input order. */
  scenarios: T[];
}

const JOURNEY_TAG = /^journey:([a-z0-9][a-z0-9_-]*)(?::(\d+))?$/i;

/** Parse one `journey:<id>[:<order>]` tag; undefined for any other tag. */
export function parseJourneyTag(tag: string): { id: string; order?: number } | undefined {
  const m = JOURNEY_TAG.exec(tag.trim());
  if (!m) return undefined;
  const id = m[1]!.toLowerCase();
  return m[2] === undefined ? { id } : { id, order: Number(m[2]) };
}

/**
 * Derive journeys from scenarios. Journeys appear in first-seen order; a
 * scenario tagged into several journeys joins each. Deterministic: explicit
 * orders sort first (ties by input order), unordered members follow in input
 * order.
 */
export function extractJourneys<T extends JourneyScenarioLike>(scenarios: T[]): Journey<T>[] {
  const order: string[] = [];
  const members = new Map<string, { scenario: T; pos: number; index: number }[]>();

  scenarios.forEach((scenario, index) => {
    for (const tag of scenario.tags) {
      const ref = parseJourneyTag(tag);
      if (!ref) continue;
      let list = members.get(ref.id);
      if (!list) {
        list = [];
        members.set(ref.id, list);
        order.push(ref.id);
      }
      list.push({ scenario, pos: ref.order ?? Number.MAX_SAFE_INTEGER, index });
    }
  });

  return order.map((id) => {
    const list = members.get(id)!;
    list.sort((a, b) => a.pos - b.pos || a.index - b.index);
    const ordered = list.map((m) => m.scenario);
    const status: TestStatus = ordered.some((s) => s.status === "failed")
      ? "failed"
      : ordered.every((s) => s.status === "passed")
        ? "passed"
        : "pending";
    return { id, title: humanizeSlug(id), status, scenarios: ordered };
  });
}
