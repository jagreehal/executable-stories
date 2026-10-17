import { describe, expect, it } from 'vitest';
import { cursorAt } from '../src/cursor.js';

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
    expect(cursorAt([{ t: 0, x: 100, y: 50 }], 0, size)).toEqual({ x: 100, y: 50, press: 1 });
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
