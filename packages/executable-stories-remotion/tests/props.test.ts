import type { ReportStep, StoryReport } from 'executable-stories-core';
import { describe, expect, it } from 'vitest';
import { storyVideoFrames, storyVideoProps } from '../src/props.js';
import { recordingFrames, stepAt } from '../src/RecordingVideo.js';
import { clipFrames, zoomAt } from '../src/zoom.js';

const step = (
  index: number,
  keyword: ReportStep['keyword'],
  text: string,
  docEntries: ReportStep['docEntries'] = [],
) =>
  ({
    id: `s--step-${index}`,
    index,
    keyword,
    text,
    status: 'passed',
    durationMs: 1,
    docEntries,
  }) as ReportStep;

const report = (status = 'passed') =>
  ({
    features: [
      {
        title: 'Checkout',
        scenarios: [
          {
            id: 'checkout--discount',
            title: 'Apply a discount code',
            status,
            steps: [
              step(0, 'Given', 'a basket with one item', [
                {
                  kind: 'state',
                  label: 'Basket',
                  value: { total: 50 },
                  phase: 'runtime',
                },
              ]),
              step(1, 'When', 'the customer enters SAVE10'),
              step(2, 'Then', 'the total drops by 10%', [
                {
                  kind: 'screenshot',
                  path: 'shots/total.png',
                  phase: 'runtime',
                },
                {
                  kind: 'state',
                  label: 'Basket',
                  value: { total: 45 },
                  phase: 'runtime',
                },
              ]),
              step(3, 'And', 'the code shows as applied'),
            ],
          },
        ],
      },
    ],
  }) as unknown as StoryReport;

describe('storyVideoProps', () => {
  it('makes a scene per frame and folds frameless steps into the next scene', () => {
    const props = storyVideoProps({
      report: report(),
      scenario: 'Apply a discount code',
      resolveAsset: (p) => `/static/${p}`,
    });

    expect(props.feature).toBe('Checkout');
    expect(props.scenes.map((s) => s.lines)).toEqual([
      ['Given a basket with one item'],
      [
        'When the customer enters SAVE10',
        'Then the total drops by 10%',
        'And the code shows as applied',
      ],
    ]);
    expect(props.scenes[1].screenshot).toEqual({
      src: '/static/shots/total.png',
      alt: undefined,
    });
    expect(props.scenes[1].states[0].changes).toEqual([
      { path: 'total', kind: 'changed', before: 50, after: 45 },
    ]);
  });

  it('finds a scenario by id and sizes the video from the scenes', () => {
    const props = storyVideoProps({
      report: report(),
      scenario: 'checkout--discount',
    });

    expect(storyVideoFrames(props, 30)).toBe(
      60 +
        Math.round(props.scenes[0].seconds * 30) +
        Math.round(props.scenes[1].seconds * 30),
    );
  });

  it('totals the same rounded frames the component places, at any frame rate', () => {
    const props = storyVideoProps({
      report: report(),
      scenario: 'checkout--discount',
    });
    const odd = {
      ...props,
      scenes: Array.from({ length: 10 }, () => ({
        ...props.scenes[0],
        seconds: 2.51,
      })),
    };

    expect(storyVideoFrames(odd, 30)).toBe(60 + 10 * 75);
    expect(storyVideoFrames(odd, 24)).toBe(48 + 10 * 60);
  });

  it('needs a passed scenario', () => {
    expect(() =>
      storyVideoProps({
        report: report('failed'),
        scenario: 'checkout--discount',
      }),
    ).toThrow(/is failed/);
  });

  it('lists the scenarios when the name is unknown', () => {
    expect(() =>
      storyVideoProps({ report: report(), scenario: 'nope' }),
    ).toThrow(/Apply a discount code/);
  });
});

describe('zoomAt', () => {
  const clicks = [
    { t: 1000, x: 100, y: 50 },
    { t: 1600, x: 300, y: 250 },
  ];

  it('stays wide with no clicks, and away from them', () => {
    expect(zoomAt([], 500)).toEqual({ scale: 1, x: 0, y: 0 });
    expect(zoomAt(clicks, 0).scale).toBe(1);
    expect(zoomAt(clicks, 5000).scale).toBe(1);
  });

  it('zooms all the way in on a click and holds it', () => {
    expect(zoomAt(clicks, 1000)).toEqual({ scale: 1.6, x: 100, y: 50 });
    expect(zoomAt(clicks, 2400)).toEqual({ scale: 1.6, x: 300, y: 250 });
  });

  it('glides between clicks close together instead of jumping', () => {
    expect(zoomAt(clicks, 1400)).toEqual({ scale: 1.6, x: 200, y: 150 });
  });

  it('moves the point continuously between clicks closer together than the glide', () => {
    const rapid = [
      { t: 1000, x: 100, y: 50 },
      { t: 1100, x: 300, y: 250 },
    ];

    for (let ms = 900; ms < 1200; ms++) {
      expect(
        Math.abs(zoomAt(rapid, ms + 1).x - zoomAt(rapid, ms).x),
      ).toBeLessThan(5);
    }

    expect(zoomAt(rapid, 1000).x).toBe(100);
    expect(zoomAt(rapid, 1100).x).toBe(300);
  });
});

describe('zoomAt on a focused field', () => {
  it('holds while the field is typed into, until the next point', () => {
    const points = [
      { t: 1000, x: 100, y: 50, kind: 'focus' as const },
      { t: 5000, x: 300, y: 250, kind: 'click' as const },
    ];

    // A click would have zoomed out by 2500ms; the focus is still being typed into.
    expect(zoomAt(points, 3000)).toMatchObject({ scale: 1.6, x: 100, y: 50 });
    expect(zoomAt(points.map((p) => ({ ...p, kind: 'click' as const })), 3000).scale).toBe(1);
  });
});

describe('stepAt', () => {
  const steps = [
    { t: 0, keyword: 'Given', text: 'a' },
    { t: 1500, keyword: 'When', text: 'b' },
  ];

  it('shows the last step that has begun', () => {
    expect(stepAt(steps, 0)).toBe(0);
    expect(stepAt(steps, 1499)).toBe(0);
    expect(stepAt(steps, 1500)).toBe(1);
    expect(stepAt(steps, 9000)).toBe(1);
  });
});

describe('recordingFrames', () => {
  it('adds the title card only when there is a title', () => {
    const clip = {
      name: 'a',
      video: 'a.mp4',
      width: 1,
      height: 1,
      durationMs: 2000,
      clicks: [],
      src: 'a.mp4',
    };

    expect(recordingFrames({ clips: [clip, clip] }, 30)).toBe(120);
    expect(recordingFrames({ title: 'Demo', clips: [clip] }, 30)).toBe(105);
    expect(clipFrames({ durationMs: 1001 }, 30)).toBe(31);
  });
});
