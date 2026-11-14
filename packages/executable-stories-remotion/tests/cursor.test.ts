import { describe, expect, it } from 'vitest';
import { cursorAt, touchAt } from '../src/cursor.js';

const size = { width: 1280, height: 720 };
const clicks = [
  { t: 1000, x: 100, y: 50 },
  { t: 1300, x: 140, y: 60 },
  { t: 2500, x: 1100, y: 600, kind: 'click' as const },
  { t: 3000, x: 640, y: 100, kind: 'focus' as const },
];

describe('cursorAt', () => {
  it('starts in the middle of the frame', () => {
    expect(cursorAt(clicks, 0, size)).toMatchObject({ x: 640, y: 360 });
  });

  it('lands exactly on each click as it happens, pressing', () => {
    for (const c of clicks.slice(0, 3)) {
      const at = cursorAt(clicks, c.t, size);

      expect(Math.round(at.x)).toBe(c.x);
      expect(Math.round(at.y)).toBe(c.y);
      expect(at.press).toBe(1);
    }
  });

  it('goes to a field being filled without pressing, and the press fades', () => {
    const field = cursorAt(clicks, 3000, size);

    expect({ x: Math.round(field.x), y: Math.round(field.y), press: field.press }).toEqual({ x: 640, y: 100, press: 0 });
    expect(cursorAt(clicks, 2500 + 250, size).press).toBe(0);
  });

  it('starts on a click at the very start, pressing there', () => {
    expect(cursorAt([{ t: 0, x: 100, y: 50 }], 0, size)).toEqual({ x: 100, y: 50, press: 1, opacity: 1 });
  });

  it('moves without jumping', () => {
    for (let ms = 0; ms < 4000; ms += 5) {
      const a = cursorAt(clicks, ms, size);
      const b = cursorAt(clicks, ms + 5, size);

      // The longest sweep here crosses about 1100px in under 600ms.
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(60);
    }
  });
});

describe('cursorAt idle hiding', () => {
  const sparse = [
    { t: 500, x: 100, y: 100, kind: 'click' as const },
    { t: 9000, x: 900, y: 500, kind: 'click' as const },
  ];

  it('stays visible through a short wait and while moving', () => {
    expect(cursorAt(sparse, 2000, size).opacity).toBe(1);
    expect(cursorAt(clicks, 2000, size).opacity).toBe(1);
  });

  it('fades out on a long wait and is back before it moves to the next click', () => {
    expect(cursorAt(sparse, 4000, size).opacity).toBe(0);
    expect(cursorAt(sparse, 9000, size)).toMatchObject({
      x: 900,
      y: 500,
      opacity: 1,
    });
    // A ~575ms move departs about 8425ms in: fading back just before, fully back once moving.
    const returning = cursorAt(sparse, 8300, size).opacity;
    expect(returning).toBeGreaterThan(0);
    expect(returning).toBeLessThan(1);
    expect(cursorAt(sparse, 8500, size).opacity).toBe(1);
  });

  it('fades out after the last click', () => {
    expect(cursorAt(sparse, 20_000, size).opacity).toBe(0);
  });
});

describe('touchAt', () => {
  const taps = [
    { t: 1000, x: 200, y: 300, kind: 'click' as const, touch: true },
    { t: 3000, x: 100, y: 600, kind: 'click' as const, touch: true },
  ];

  it('shows a fingertip only around each tap, pressing as it lands', () => {
    expect(touchAt(taps, 500)).toBeUndefined();
    expect(touchAt(taps, 1000)).toEqual({ x: 200, y: 300, opacity: 1, press: 1 });
    expect(touchAt(taps, 940)!.opacity).toBeCloseTo(0.5);
    const fading = touchAt(taps, 1225)!;
    expect(fading.opacity).toBeCloseTo(0.5);
    expect(fading.press).toBeCloseTo(0.1);
    expect(touchAt(taps, 2000)).toBeUndefined();
    expect(touchAt(taps, 3000)).toMatchObject({ x: 100, y: 600 });
  });

  it('ignores mouse clicks', () => {
    expect(touchAt([{ t: 1000, x: 1, y: 1, kind: 'click' }], 1000)).toBeUndefined();
  });
});

describe('touchAt rapid taps', () => {
  it('shows a tap that has landed before the next one fading in', () => {
    const taps = [
      { t: 1000, x: 10, y: 10, kind: 'click' as const, touch: true },
      { t: 1100, x: 100, y: 100, kind: 'click' as const, touch: true },
    ];
    expect(touchAt(taps, 1000)).toMatchObject({ x: 10, y: 10, press: 1 });
    expect(touchAt(taps, 1050)).toMatchObject({ x: 10, y: 10 });
    expect(touchAt(taps, 1100)).toMatchObject({ x: 100, y: 100, press: 1 });
    // Before anything lands, the first tap still fades in ahead of time.
    expect(touchAt(taps, 940)).toMatchObject({ x: 10, y: 10, press: 0 });
  });

  it('moves to a quick second tap instead of holding the first', () => {
    const taps = [
      { t: 1000, x: 10, y: 10, kind: 'click' as const, touch: true },
      { t: 1200, x: 300, y: 400, kind: 'click' as const, touch: true },
    ];
    expect(touchAt(taps, 1050)).toMatchObject({ x: 10, y: 10 });
    expect(touchAt(taps, 1200)).toMatchObject({ x: 300, y: 400, press: 1 });
    expect(touchAt(taps, 1400)).toMatchObject({ x: 300, y: 400 });
  });
});
