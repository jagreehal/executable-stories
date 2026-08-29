/**
 * Which steps in a scenario state its claim.
 *
 * Auto-And conversion rewrites a repeated `Then` to `And` before the step is
 * stored, so the stored keyword no longer says whether a step is setup or
 * assertion. The original intent is still recoverable by position: `And` and
 * `But` continue whichever primary keyword last appeared.
 */

import type { StoryStep } from '../types/story.js';

/**
 * The steps that state the scenario's claim, in order.
 *
 * Given/When steps arrange and act; only Then (and the And/But steps
 * continuing it) assert. An assertion made during setup says the setup worked,
 * not that the claim holds.
 */
export function assertiveSteps<T extends Pick<StoryStep, 'keyword'>>(
  steps: readonly T[],
): T[] {
  let primary: StoryStep['keyword'] = 'Given';
  const assertive: T[] = [];
  for (const step of steps) {
    if (
      step.keyword === 'Given' ||
      step.keyword === 'When' ||
      step.keyword === 'Then'
    ) {
      primary = step.keyword;
    }
    if (primary === 'Then') assertive.push(step);
  }
  return assertive;
}

/**
 * Whether a scenario's claim was checked.
 *
 * - `asserted`: at least one of its claim steps asserted something
 * - `unasserted`: its claim steps ran and asserted nothing
 * - `unobserved`: the adapter has no assertion counter, or the scenario makes
 *   no claim at all
 *
 * `unobserved` is deliberately not `unasserted`. Go, Rust, pytest, JUnit 5 and
 * xUnit cannot count assertions, and reading their silence as zero would accuse
 * every scenario they produce of proving nothing.
 */
export function assertionState<
  T extends Pick<StoryStep, 'keyword' | 'assertions'>,
>(steps: readonly T[]): 'asserted' | 'unasserted' | 'unobserved' {
  const observed = assertiveSteps(steps).filter(
    (step) => typeof step.assertions === 'number',
  );
  if (observed.length === 0) return 'unobserved';
  return observed.some((step) => (step.assertions ?? 0) > 0)
    ? 'asserted'
    : 'unasserted';
}
