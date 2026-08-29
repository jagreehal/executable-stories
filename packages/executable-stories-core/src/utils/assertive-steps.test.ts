/**
 * Recovering which steps state the claim after auto-And has erased the keyword.
 */
import { describe, expect, it } from 'vitest';
import type { StoryStep } from '../types/story.js';
import { assertionState, assertiveSteps } from './assertive-steps.js';

type Probe = {
  keyword: StoryStep['keyword'];
  text: string;
  assertions?: number;
};

const texts = (steps: Probe[]) => assertiveSteps(steps).map((s) => s.text);

describe('assertiveSteps', () => {
  it('picks the Then out of a Given/When/Then scenario', () => {
    expect(
      texts([
        { keyword: 'Given', text: 'setup' },
        { keyword: 'When', text: 'action' },
        { keyword: 'Then', text: 'claim' },
      ]),
    ).toEqual(['claim']);
  });

  it('keeps an And that auto-conversion rewrote from a repeated Then', () => {
    // Stored as Given, And, Then, And — the second And was written as then().
    expect(
      texts([
        { keyword: 'Given', text: 'first setup' },
        { keyword: 'And', text: 'more setup' },
        { keyword: 'Then', text: 'first claim' },
        { keyword: 'And', text: 'second claim' },
      ]),
    ).toEqual(['first claim', 'second claim']);
  });

  it('treats a But continuing a Then as part of the claim', () => {
    expect(
      texts([
        { keyword: 'Given', text: 'setup' },
        { keyword: 'Then', text: 'an error is shown' },
        { keyword: 'But', text: 'the session is not created' },
      ]),
    ).toEqual(['an error is shown', 'the session is not created']);
  });

  it('treats a But continuing a Given as setup, not a claim', () => {
    expect(
      texts([
        { keyword: 'Given', text: 'the user exists' },
        { keyword: 'But', text: 'the account is suspended' },
        { keyword: 'Then', text: 'login is refused' },
      ]),
    ).toEqual(['login is refused']);
  });

  it('finds nothing to assert in a scenario that never reaches Then', () => {
    expect(
      texts([
        { keyword: 'Given', text: 'setup' },
        { keyword: 'When', text: 'action' },
      ]),
    ).toEqual([]);
  });

  it('stops treating steps as claims once a later When starts a new phase', () => {
    expect(
      texts([
        { keyword: 'Then', text: 'first claim' },
        { keyword: 'When', text: 'a second action' },
        { keyword: 'And', text: 'more action' },
      ]),
    ).toEqual(['first claim']);
  });
});

describe('assertionState', () => {
  it('reports a scenario whose claim was checked as asserted', () => {
    expect(
      assertionState([
        { keyword: 'Given', text: 'setup', assertions: 0 },
        { keyword: 'Then', text: 'claim', assertions: 2 },
      ] as Probe[]),
    ).toBe('asserted');
  });

  it('reports a scenario whose claim checked nothing as unasserted', () => {
    expect(
      assertionState([
        { keyword: 'Given', text: 'setup', assertions: 1 },
        { keyword: 'Then', text: 'claim', assertions: 0 },
      ] as Probe[]),
    ).toBe('unasserted');
  });

  it('reports a scenario from an adapter with no counter as unobserved', () => {
    expect(
      assertionState([
        { keyword: 'Given', text: 'setup' },
        { keyword: 'Then', text: 'claim' },
      ] as Probe[]),
    ).toBe('unobserved');
  });

  it('reports a scenario that makes no claim at all as unobserved', () => {
    // Nothing was asserted because nothing was claimed. That is not the same
    // failing as a Then that checked nothing.
    expect(
      assertionState([
        { keyword: 'Given', text: 'setup', assertions: 0 },
        { keyword: 'When', text: 'action', assertions: 0 },
      ] as Probe[]),
    ).toBe('unobserved');
  });
});
