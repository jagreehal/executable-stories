/** A click from a `<name>.video.json` manifest: ms into the video and pixels in it. */
export type Click = { t: number; x: number; y: number };

/** What `executable-stories-showcase record` writes to `<name>.video.json` next to each video. */
export type VideoManifest = {
  name: string;
  description?: string;
  /** The video's file name, in the manifest's folder. */
  video: string;
  width: number;
  height: number;
  durationMs: number;
  clicks: Click[];
};

const LEAD = 400;
const HOLD = 900;
const OUT = 600;

const ease = (p: number) => p * p * (3 - 2 * p);
const clamp = (p: number) => Math.min(1, Math.max(0, p));

/** 0 to 1: zooming in before a click, held after it, then zooming out. */
const level = (ms: number) =>
  ms < 0 ? ease(clamp(1 + ms / LEAD)) : ease(clamp(1 - (ms - HOLD) / OUT));

/**
 * The camera at `ms`: how far it zooms in and the point it zooms to. The camera reaches each click
 * as it lands, and between clicks close enough to overlap it glides from one to the next.
 */
export function zoomAt(clicks: Click[], ms: number, peak = 1.6) {
  const strength = Math.max(0, ...clicks.map((c) => level(ms - c.t)));
  const next = clicks.findIndex((c) => c.t >= ms);
  const to = clicks[next === -1 ? clicks.length - 1 : next];
  const from = clicks[next - 1] ?? to;

  if (!to || !from) return { scale: 1, x: 0, y: 0 };

  // Starts at the previous click when they are closer than LEAD, so the point never jumps.
  const glideStart = Math.max(from.t, to.t - LEAD);
  const glide =
    to.t > glideStart
      ? ease(clamp((ms - glideStart) / (to.t - glideStart)))
      : 1;

  return {
    scale: 1 + (peak - 1) * strength,
    x: from.x + (to.x - from.x) * glide,
    y: from.y + (to.y - from.y) * glide,
  };
}

/** Frames a recording plays for: all of it. */
export const clipFrames = (
  clip: Pick<VideoManifest, 'durationMs'>,
  fps: number,
) => Math.ceil((clip.durationMs / 1000) * fps);
