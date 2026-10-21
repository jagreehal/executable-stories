import { describe, expect, it } from 'vitest';
import { articleSteps, articleVideoFrames, unmatchedQuotes } from '../src/ArticleVideo.js';
import type { RecordingClip } from '../src/RecordingVideo.js';

const steps = [
  { t: 0, keyword: 'Given', text: 'the contacts page' },
  { t: 1200, keyword: 'When', text: 'a contact is named' },
];
const clip = {
  name: 'c',
  src: 'c.mp4',
  video: 'c.mp4',
  width: 1280,
  height: 720,
  durationMs: 10_000,
  clicks: [],
  steps,
} as RecordingClip;

describe('articleSteps', () => {
  it("uses the article's wording where given and the step text otherwise", () => {
    expect(
      articleSteps(steps, { 'a contact is named': 'Give your contact a name.' }),
    ).toEqual(['the contacts page', 'Give your contact a name.']);
  });

  it('takes a quote by step number, which survives rewording the step', () => {
    expect(articleSteps(steps, { '1': 'Open Contacts.' })).toEqual([
      'Open Contacts.',
      'a contact is named',
    ]);
  });

  it('finds quotes no step has any more', () => {
    expect(
      unmatchedQuotes(steps, { '2': 'x', 'a contact is named': 'y', 'the old step': 'z', '3': 'w' }),
    ).toEqual(['3', 'the old step']);
  });
});

describe('articleVideoFrames', () => {
  it('adds the title, table and outro to the recording', () => {
    const recording = articleVideoFrames({ clip }, 30) - (3 + 3) * 30;
    expect(recording).toBeGreaterThan(0);
    expect(
      articleVideoFrames(
        { clip, table: { label: 't', columns: [], rows: [] } },
        30,
      ),
    ).toBe(articleVideoFrames({ clip }, 30) + 4 * 30);
  });

  it('holds a long table until its last row has appeared', () => {
    const rows = Array.from({ length: 8 }, () => ['x']);
    const tableFrames =
      articleVideoFrames(
        { clip, table: { label: 't', columns: ['a'], rows } },
        30,
      ) - articleVideoFrames({ clip }, 30);
    // The eighth row finishes fading in at 0.6 + 7 × 0.7 + 0.3 = 5.8s.
    expect(tableFrames).toBeGreaterThan(5.8 * 30);
  });
});
