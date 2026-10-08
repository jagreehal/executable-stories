/**
 * Animated GIF walkthroughs from a run (fn(args, deps) pattern): one GIF per
 * passing scenario, one frame per step screenshot, in step order. The frames are
 * the screenshots the run already captured, so a GIF is regenerated, never filmed.
 * Encoding is ffmpeg's two-pass palette, the same tool the demo-video skill uses.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { TestCaseResult } from "executable-stories-core/types/test-result";
import { slugify } from "executable-stories-core/converters/acl/ids";

export interface GifArgs {
  testCases: TestCaseResult[];
  outputDir: string;
  /** How long each frame shows. Default 1.5 seconds. */
  secondsPerFrame?: number;
  /** Frames wider than this are scaled down. Default 1280. */
  maxWidth?: number;
}

export interface GifDeps {
  /** Runs ffmpeg with these arguments; rejects when it fails or is missing. */
  ffmpeg(args: string[]): Promise<void>;
}

export interface GifResult {
  written: { scenario: string; path: string; frames: number }[];
  /** Scenarios left out, with why: not passing, or fewer than two screenshots. */
  skipped: { scenario: string; reason: string }[];
}

/** Each step screenshot of a scenario, in order: data URIs decoded, file paths read. */
export function screenshotFrames(tc: TestCaseResult): Buffer[] {
  return tc.story.steps.flatMap((step) =>
    (step.docs ?? []).flatMap((doc) => {
      if (doc.kind !== "screenshot") return [];
      const match = /^data:image\/png;base64,(.*)$/.exec(doc.path);
      if (match) return [Buffer.from(match[1], "base64")];
      return fs.existsSync(doc.path) ? [fs.readFileSync(doc.path)] : [];
    }),
  );
}

/** PNG width and height, from the IHDR chunk. */
export function pngSize(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

export async function writeGifs(args: GifArgs, deps: GifDeps): Promise<GifResult> {
  const { testCases, outputDir, secondsPerFrame = 1.5, maxWidth = 1280 } = args;
  const result: GifResult = { written: [], skipped: [] };
  const used = new Set<string>();

  for (const tc of testCases) {
    const scenario = tc.story.scenario;
    // Docs show passing scenarios only.
    if (tc.status !== "passed") {
      result.skipped.push({ scenario, reason: tc.status });
      continue;
    }
    const frames = screenshotFrames(tc).filter((f) => f.subarray(1, 4).toString() === "PNG");
    if (frames.length < 2) {
      result.skipped.push({ scenario, reason: `${frames.length} screenshot(s), need 2` });
      continue;
    }

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-gif-"));
    try {
      frames.forEach((f, i) => fs.writeFileSync(path.join(dir, `${String(i).padStart(3, "0")}.png`), f));
      // Frames can differ in size (full-page captures), and a GIF can't: pad each to the largest.
      const sizes = frames.map(pngSize);
      const w = Math.max(...sizes.map((s) => s.width));
      const h = Math.max(...sizes.map((s) => s.height));
      let name = slugify(scenario) || "scenario";
      for (let n = 2; used.has(name); n++) name = `${slugify(scenario) || "scenario"}-${n}`;
      used.add(name);
      const out = path.join(outputDir, `${name}.gif`);
      fs.mkdirSync(outputDir, { recursive: true });
      await deps.ffmpeg([
        "-y",
        "-loglevel", "error",
        "-framerate", `1/${secondsPerFrame}`,
        "-i", path.join(dir, "%03d.png"),
        "-vf",
        `pad=${w}:${h}:0:0:white,scale='min(${maxWidth},iw)':-2:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse`,
        "-loop", "0",
        out,
      ]);
      result.written.push({ scenario, path: out, frames: frames.length });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  return result;
}
