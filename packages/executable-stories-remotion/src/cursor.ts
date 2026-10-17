import type { Click } from './zoom.js';

/**
 * A pointer drawn from the click log, for recordings with no cursor in them (Playwright never
 * moves a real one). It reads as a hand on a mouse: it travels to each click on a gentle arc,
 * taking longer for long moves and overshooting a touch, and wanders slightly while parked. It
 * still lands exactly on each click at its time. It goes to a field being filled too, as a hand
 * would before typing, but only a click presses.
 */

const MOVE = 400;
const PULSE = 250;
/** Idle wander while parked, as a share of the width (about 6px on a 1440px frame). */
const DRIFT = 0.004;
/** Wander fades in after arriving and out before leaving, so it is exact at both ends. */
const DRIFT_RAMP = 600;

const clamp = (p: number) => Math.min(1, Math.max(0, p));
/** Zero speed at both ends. */
const smooth = (p: number) => p * p * (3 - 2 * p);
/** Ends at 1 after passing it briefly; c = 0 is a plain ease-out. */
const backOut = (p: number, c: number) => {
  const q = p - 1;

  return 1 + (c + 1) * q * q * q + c * q * q;
};

const drift = (ms: number, seed: number) => ({
  dx: DRIFT * (0.6 * Math.sin(ms / 830 + seed) + 0.4 * Math.sin(ms / 370 + seed * 2.3)),
  dy: DRIFT * (0.6 * Math.cos(ms / 1110 + seed * 1.7) + 0.4 * Math.sin(ms / 510 + seed)),
});

/**
 * Where the pointer is at `ms`, in the video's pixels, and `press`: 1 as a click lands, fading
 * to 0. It starts in the middle of the frame, or on a point at the very start.
 */
export function cursorAt(clicks: Click[], ms: number, { width, height }: { width: number; height: number }) {
  // A point as the video starts is where the pointer starts.
  const start = clicks.findLast((c) => c.t <= 0) ?? { x: width / 2, y: height / 2 };
  const points = [{ t: 0, x: start.x, y: start.y }, ...clicks.filter((c) => c.t > 0)];
  const last = clicks.findLast((c) => c.kind !== 'focus' && c.t <= ms);
  const press = last && ms - last.t < PULSE ? 1 - (ms - last.t) / PULSE : 0;
  const parked = (at: { x: number; y: number }, seed: number, k: number) => {
    const { dx, dy } = drift(ms, seed);

    return { x: at.x + dx * width * k, y: at.y + dy * width * k, press };
  };

  const i = points.findIndex((p) => p.t > ms);
  if (i === -1) {
    const end = points.at(-1)!;

    return parked(end, points.length, clamp((ms - end.t) / DRIFT_RAMP));
  }

  const to = points[i]!;
  const from = points[i - 1]!;
  // Distance as a share of the width, so pacing is the same at any size.
  const dist = Math.hypot(to.x - from.x, to.y - from.y) / width;
  const travel = Math.min(MOVE * (0.6 + 1.2 * Math.min(dist, 1)), to.t - from.t);
  const depart = to.t - travel;

  if (ms <= depart || travel <= 0) {
    return parked(from, i, Math.min(clamp((ms - from.t) / DRIFT_RAMP), clamp((depart - ms) / DRIFT_RAMP)));
  }

  // A quadratic arc whose bend alternates sides, so consecutive moves don't all bow one way.
  const bow = 0.18 * (i % 2 === 0 ? 1 : -1);
  const cx = (from.x + to.x) / 2 - (to.y - from.y) * bow;
  const cy = (from.y + to.y) / 2 + (to.x - from.x) * bow;
  const p = backOut(smooth(clamp((ms - depart) / travel)), dist > 0.15 ? 0.7 : 0);
  const u = 1 - p;

  return {
    x: u * u * from.x + 2 * u * p * cx + p * p * to.x,
    y: u * u * from.y + 2 * u * p * cy + p * p * to.y,
    press,
  };
}
