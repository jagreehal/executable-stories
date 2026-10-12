import { spawnSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { CliError } from './errors.js';

export type VideoFormat = 'mp4' | 'gif' | 'webm';

export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The part of an element's box the video shows. Video holds only the viewport, so a crop must
 * stay inside it; `clipped` says the element was larger than the visible area.
 */
export function visibleCrop(box: Crop, viewport: { width: number; height: number; }) {
  const x = Math.max(0, box.x);
  const y = Math.max(0, box.y);
  const width = Math.min(viewport.width, box.x + box.width) - x;
  const height = Math.min(viewport.height, box.y + box.height) - y;

  if (width < 2 || height < 2) return undefined;

  return { crop: { x, y, width, height }, clipped: width < box.width || height < box.height };
}

const even = (n: number) => Math.max(2, Math.floor(n / 2) * 2);

/**
 * ffmpeg arguments that trim the page load off the start, crop to an element, and encode.
 * MP4 is H.264 in yuv420p so it plays everywhere, including Safari and phones; GIF uses a
 * generated palette, which keeps it sharp at a fraction of the naive size.
 */
export function ffmpegArgs(
  { input, output, format, start, crop }: {
    input: string;
    output: string;
    format: VideoFormat;
    /** Seconds to skip, e.g. the page loading before the steps begin. */
    start: number;
    crop?: Crop;
  },
): string[] {
  // yuv420p needs even sizes.
  const filters = crop
    ? [`crop=${even(crop.width)}:${even(crop.height)}:${Math.round(crop.x)}:${Math.round(crop.y)}`]
    : [];

  const codec = {
    mp4: ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-movflags', '+faststart'],
    webm: ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32'],
    gif: [],
  }[format];

  const vf = format === 'gif'
    ? `${
      [...filters, 'fps=12'].join(',')
    },split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer`
    : filters.join(',');

  return [
    '-y',
    '-loglevel',
    'error',
    '-i',
    input,
    '-ss',
    start.toFixed(2),
    ...(vf ? ['-vf', vf] : []),
    '-an',
    ...codec,
    output,
  ];
}

/**
 * Convert Playwright's WebM into the requested format. Uncropped WebM is copied as recorded
 * (page load included), so it works without ffmpeg.
 */
export function encodeVideo(options: Parameters<typeof ffmpegArgs>[0]) {
  if (options.format === 'webm' && !options.crop) {
    copyFileSync(options.input, options.output);

    return;
  }

  // FFMPEG_PATH is the usual override when ffmpeg isn't on PATH (common on Windows).
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const result = spawnSync(ffmpeg, ffmpegArgs(options), { encoding: 'utf8' });

  if (result.error) {
    throw new CliError(
      'FFMPEG_MISSING',
      `record needs ffmpeg for ${options.format}${
        options.crop ? ' and --element' : ''
      }: install it (https://ffmpeg.org/download.html) or set FFMPEG_PATH`,
    );
  }

  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr.trim()}`);
}
