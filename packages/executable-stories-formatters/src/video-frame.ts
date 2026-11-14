/**
 * `executable-stories video --frame`: dress an MP4 for a help-centre article or README with
 * ffmpeg alone, for videos that skip Remotion.
 *
 * Rings each click (a fingertip for a tap), puts the recording under a browser title bar
 * showing the page's address at each moment, and sets the window on a padded background.
 * Positions and times come from the manifest. Corners are square; Remotion's card is rounded.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { VideoManifest } from "./video";

/** Where to look for a font `drawtext` can use, when the run names none. */
export const FONT_CANDIDATES = [
  "/System/Library/Fonts/Helvetica.ttc",
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/Library/Fonts/Arial.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/TTF/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
  "C:/Windows/Fonts/arial.ttf",
  "C:/Windows/Fonts/segoeui.ttf",
];

/** Default background: a quiet slate gradient that suits light and dark apps. */
export const DEFAULT_FRAME_BACKGROUND = "#0f172a,#334155";

const ACCENT = { r: 109, g: 40, b: 217 };

/** A background is one hex colour, or two joined by a comma for a diagonal gradient. */
export function parseBackground(spec: string): { from: string; to?: string } | undefined {
  const parts = spec.split(",").map((p) => p.trim());
  const hex = /^#?[0-9a-f]{6}$/i;
  if (parts.length > 2 || !parts.every((p) => hex.test(p))) return undefined;
  const norm = (p: string) => `0x${p.replace("#", "")}`;
  return parts.length === 2 ? { from: norm(parts[0]!), to: norm(parts[1]!) } : { from: norm(parts[0]!) };
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
const sec = (ms: number) => (Math.max(0, ms) / 1000).toFixed(3);

/** Quote a path for a filter option: ffmpeg's two escaping levels, with forward slashes. */
function quotePath(p: string): string {
  return `'${p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "'\\''")}'`;
}

/** A `size`-pixel square with a circle drawn by `geq`: a ring, or a fingertip dot. */
function marker(size: number, kind: "ring" | "dot", label: string): string {
  const c = size / 2;
  const d = `hypot(X-${c},Y-${c})`;
  const rim = `gt(${d},${(c * 0.78).toFixed(1)})`;
  // Accent outer rim, white inside it, so it reads on light and dark pages alike.
  const channel = (v: number) => `if(${rim},${v},255)`;
  const alpha =
    kind === "ring"
      ? `if(between(${d},${(c * 0.6).toFixed(1)},${c - 1}),235,0)`
      : `if(lte(${d},${c - 1}),if(${rim},235,140),0)`;
  return (
    `color=c=black@0:s=${size}x${size}:r=25,format=rgba,` +
    `geq=r='${channel(ACCENT.r)}':g='${channel(ACCENT.g)}':b='${channel(ACCENT.b)}':a='${alpha}'[${label}]`
  );
}

/** A filled circle of one colour, for the title bar's window buttons. */
function dot(size: number, hex: string, label: string): string {
  const c = size / 2;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (
    `color=c=black@0:s=${size}x${size}:r=25,format=rgba,` +
    `geq=r='${r}':g='${g}':b='${b}':a='if(lte(hypot(X-${c},Y-${c}),${c - 0.5}),255,0)'[${label}]`
  );
}

export interface FrameLayout {
  width: number;
  height: number;
  bar: number;
  padding: number;
}

/** The framed video's geometry: the recording, a title bar above it, padding all round. */
export function frameLayout(manifest: Pick<VideoManifest, "width" | "height">): FrameLayout {
  const bar = even(Math.max(24, manifest.width * 0.034));
  const padding = even(manifest.width * 0.06);
  return {
    width: manifest.width + 2 * padding,
    height: manifest.height + bar + 2 * padding,
    bar,
    padding,
  };
}

/**
 * ffmpeg arguments that render the background once, as a PNG the frame pass loops: a solid
 * colour, or a diagonal gradient drawn with `geq`, which every ffmpeg build has.
 */
export function backgroundArgs(
  manifest: Pick<VideoManifest, "width" | "height">,
  background: string,
  out: string,
): string[] {
  const bg = parseBackground(background);
  if (!bg) throw new Error(`frame background must be "#rrggbb" or "#rrggbb,#rrggbb", got "${background}"`);
  const { width, height } = frameLayout(manifest);
  const rgb = (hex: string) => [2, 4, 6].map((i) => parseInt(hex.slice(i, i + 2), 16));
  let source = `color=c=${bg.from}:s=${width}x${height}`;
  if (bg.to) {
    const [from, to] = [rgb(bg.from), rgb(bg.to)];
    const channel = (i: number) => `${from[i]}+(${to[i]! - from[i]!})*(X/W+Y/H)/2`;
    source += `,format=rgb24,geq=r='${channel(0)}':g='${channel(1)}':b='${channel(2)}'`;
  }
  return ["-y", "-loglevel", "error", "-f", "lavfi", "-i", source, "-frames:v", "1", out];
}

/**
 * The ffmpeg graph that frames input 0 (the manifest's video) on input 1 (the background
 * from `backgroundArgs`, looped) into `[out]`. `urlFiles` holds one text file per entry of
 * `manifest.pages`, read by `drawtext` so no address needs escaping; without them, or
 * without `fontFile`, the bar shows no address.
 */
export function frameFilter(
  manifest: VideoManifest,
  { fontFile, urlFiles }: { fontFile?: string; urlFiles?: string[] } = {},
): string {
  const { width: W } = manifest;
  const { padding, bar } = frameLayout(manifest);
  const parts: string[] = [];
  let cur = "0:v";

  // Click rings (fingertips for taps), each shown from just before it lands until it fades.
  const clicks = manifest.clicks.filter((c) => c.kind !== "focus");
  if (clicks.length > 0) {
    const size = even(Math.max(36, W * 0.035));
    const touch = clicks.filter((c) => c.touch);
    const mouse = clicks.filter((c) => !c.touch);
    const sources: [typeof clicks, "ring" | "dot", string][] = [
      [mouse, "ring", "ring"],
      [touch, "dot", "tap"],
    ];
    for (const [list, kind, label] of sources) {
      if (list.length === 0) continue;
      parts.push(marker(size, kind, `${label}src`));
      parts.push(`[${label}src]split=${list.length}${list.map((_, i) => `[${label}${i}]`).join("")}`);
      list.forEach((c, i) => {
        const next = `${label}v${i}`;
        parts.push(
          `[${cur}][${label}${i}]overlay=x=${Math.round(c.x - size / 2)}:y=${Math.round(c.y - size / 2)}:` +
            `enable='between(t,${sec(c.t - 80)},${sec(c.t + 450)})':shortest=1[${next}]`,
        );
        cur = next;
      });
    }
  }

  // Title bar: three window buttons, an address field, and the address showing at each moment.
  const button = even(bar * 0.36);
  parts.push(`color=c=0xe8e8ec:s=${W}x${bar}:r=25[bar0]`);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((hex, i) => {
    parts.push(dot(button, hex, `btn${i}`));
    parts.push(
      `[bar${i}][btn${i}]overlay=x=${Math.round(bar * 0.45 + i * button * 1.6)}:y=${(bar - button) / 2}:shortest=1[bar${i + 1}]`,
    );
  });
  const fieldX = Math.round(bar * 0.45 + 3 * button * 1.6 + bar * 0.6);
  const fieldW = Math.max(0, W - fieldX - Math.round(bar * 1.6));
  const fieldH = even(bar * 0.62);
  let barChain = `[bar3]drawbox=x=${fieldX}:y=${(bar - fieldH) / 2}:w=${fieldW}:h=${fieldH}:color=white:t=fill`;
  if (fontFile && urlFiles && manifest.pages) {
    manifest.pages.forEach((page, i) => {
      const end = manifest.pages![i + 1]?.t ?? manifest.durationMs + 1000;
      barChain +=
        `,drawtext=textfile=${quotePath(urlFiles[i]!)}:expansion=none:fontfile=${quotePath(fontFile)}:` +
        `fontsize=${Math.round(bar * 0.4)}:fontcolor=0x3c3c43:x=${fieldX}+(${fieldW}-text_w)/2:y=(h-text_h)/2:` +
        `enable='between(t,${sec(page.t)},${sec(end)})'`;
    });
  }
  // vstack needs both inputs in one pixel format.
  parts.push(`${barChain},format=yuv420p[barfinal]`);
  parts.push(`[${cur}]format=yuv420p[recording]`);
  parts.push(`[barfinal][recording]vstack=shortest=1[window]`);

  // The window, padded on the background image.
  parts.push(`[1:v][window]overlay=x=${padding}:y=${padding}:shortest=1,format=yuv420p[out]`);
  return parts.join(";");
}

/** The address as the bar shows it: no scheme, cut to fit the field, about 0.55em a character. */
export function barText(url: string, fieldWidth: number, fontSize: number): string {
  const text = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const max = Math.max(8, Math.floor(fieldWidth / (fontSize * 0.55)));
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** One text file per page address, for `drawtext` to read verbatim. */
export function writeUrlFiles(manifest: VideoManifest, dir: string): string[] {
  const { bar } = frameLayout(manifest);
  const fieldWidth = manifest.width - Math.round(bar * 0.45 + 3 * even(bar * 0.36) * 1.6 + bar * 0.6) - Math.round(bar * 1.6);
  return (manifest.pages ?? []).map((page, i) => {
    const file = path.join(dir, `url-${i}.txt`);
    fs.writeFileSync(file, barText(page.url, fieldWidth, Math.round(bar * 0.4)));
    return file;
  });
}

/** The first font on this machine `drawtext` can use. */
export function findFont(candidates = FONT_CANDIDATES, exists = fs.existsSync): string | undefined {
  return candidates.find((f) => exists(f));
}
