/**
 * MP4s from a run's screen recordings (fn(args, deps) pattern): one per passing
 * scenario that Playwright recorded (`story.init(..., { featureVideo: true })`),
 * with the blank page load cut off the start, and a `<name>.video.json` manifest
 * beside it that executable-stories-remotion reads: size, length, each click and
 * focused field, and when each step began. Same naming as `gif`.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { TestCaseResult } from "executable-stories-core/types/test-result";
import { scenarioSlug } from "executable-stories-core/utils/slug";

export interface VideoArgs {
  testCases: TestCaseResult[];
  outputDir: string;
  /** Cut the blank page off the start. Default true. */
  trimLeadIn?: boolean;
  /**
   * Start each video at this step, leaving sign-in and setup off camera: a step number from 1,
   * or a keyword ("When" starts at the first When). A scenario without that step is not cut.
   */
  fromStep?: string;
  /** Also write a still per step, and a close-up of its click, into `<name>/` for an agent to check. */
  frames?: boolean;
}

export interface VideoDeps {
  /** Runs ffmpeg or ffprobe; resolves with their output, rejects when it fails or is missing. */
  exec(command: "ffmpeg" | "ffprobe", args: string[]): Promise<{ stdout: string; stderr: string }>;
}

/** `<name>.video.json`: the shape executable-stories-remotion's `VideoManifest` reads. */
export interface VideoManifest {
  name: string;
  description?: string;
  video: string;
  width: number;
  height: number;
  durationMs: number;
  /** Clicks and focused fields: ms into the video, pixels in it, and the share of the page the element covers. */
  clicks: { t: number; x: number; y: number; kind: "click" | "focus"; cover?: number }[];
  /** Each step, from when it began: ms into the video. Steps before the trim start at 0. */
  steps: { t: number; keyword: string; text: string }[];
}

/** A step whose line, said aloud, runs past the next step (or the end of the video). */
export interface StepOverrun {
  step: string;
  /** How long the line takes to say. */
  needMs: number;
  /** How long the step is on screen. */
  haveMs: number;
}

/** A step's still: the frame as it ends, and a close-up of its last click, ringed, when it has one. */
export interface StepFrame {
  step: string;
  frame: string;
  closeUp?: string;
}

export interface VideoResult {
  written: {
    scenario: string;
    video: string;
    manifest: string;
    trimmedMs: number;
    overruns: StepOverrun[];
    frames?: StepFrame[];
  }[];
  /** Scenarios left out, with why: not passing, or not recorded. */
  skipped: { scenario: string; reason: string }[];
}

/** One frame: its time, and the share of it (0 to 100) that is near-white. */
interface FrameCoverage {
  t: number;
  white: number;
}

/**
 * Parses ffmpeg's `negate,blackframe=amount=0` log: after negating, the near-white
 * pixels are the "black" ones, so `pblack` is how much of the frame is blank page.
 */
export function parseFrames(log: string): FrameCoverage[] {
  return [...log.matchAll(/pblack:(\d+).*? t:([\d.]+)/g)].map((m) => ({ t: Number(m[2]), white: Number(m[1]) }));
}

/**
 * Seconds until the first frame that shows the app: Playwright's blank page is
 * white, so it ends at the first frame with 2% or more of it not white. A drawn
 * cursor (showcase's `showCursor`) covers well under 1%, so it doesn't count.
 * For an app whose first screen is near-empty white, pass `--no-trim`.
 */
export function leadInSeconds(frames: FrameCoverage[]): number {
  return frames.find((f) => f.white < 99)?.t ?? 0;
}

/** The recording a scenario carries, as a file path; inline (small) recordings are written to `tmp`. */
function recordingFile(tc: TestCaseResult, tmp: string): string | undefined {
  const att = tc.attachments.find((a) => a.mediaType.startsWith("video/"));
  if (!att) return undefined;
  if (att.external || att.contentEncoding === "IDENTITY") return fs.existsSync(att.body) ? att.body : undefined;
  const file = path.join(tmp, "recording.webm");
  fs.writeFileSync(file, Buffer.from(att.body, "base64"));
  return file;
}

/**
 * The manifest for a recording `size` pixels wide with `trimmedMs` cut off. Times
 * count from when recording began, which the adapter notes in `story.recording`;
 * without it the manifest has no clicks or steps.
 */
export function videoManifest(
  tc: TestCaseResult,
  { name, size, durationMs, trimmedMs }: { name: string; size: { width: number; height: number }; durationMs: number; trimmedMs: number },
): VideoManifest {
  const recording = tc.story.recording;
  const origin = recording?.startedAtMs;
  const at = (ms: number) => Math.round(ms - (origin ?? 0) - trimmedMs);
  // Playwright fits the viewport inside the video, top-left, so the tighter side sets the scale:
  // a portrait viewport in a landscape video is scaled by height. It only scales down: a phone
  // viewport in a larger video stays 1:1 in the corner, with the rest padded. After a resize it
  // fits the new size the same way, so each point uses the viewport it happened in.
  const ratio = (viewport = recording?.viewport) =>
    viewport ? Math.min(1, size.width / viewport.width, size.height / viewport.height) : 1;
  return {
    name,
    description: tc.story.scenario,
    video: `${name}.mp4`,
    width: size.width,
    height: size.height,
    durationMs: Math.round(durationMs),
    clicks:
      origin === undefined
        ? []
        : (recording?.attention ?? [])
            .map((p) => {
              const r = ratio(p.viewport);
              // `cover` is a share of the page; a page padded inside a larger video covers less of it.
              const page = p.viewport ?? recording?.viewport;
              const cover =
                p.cover === undefined
                  ? undefined
                  : page
                    ? Math.min(1, (p.cover * page.width * page.height * r * r) / (size.width * size.height))
                    : p.cover;
              return {
                t: at(p.at),
                x: Math.round(p.x * r),
                y: Math.round(p.y * r),
                kind: p.kind,
                ...(cover !== undefined ? { cover: Math.round(cover * 1000) / 1000 } : {}),
              };
            })
            .filter((c) => c.t >= 0 && c.t <= durationMs && c.x >= 0 && c.y >= 0 && c.x < size.width && c.y < size.height),
    steps:
      origin === undefined
        ? []
        : tc.story.steps
            .filter((s) => s.startedAtMs !== undefined)
            .map((s) => ({ t: Math.max(0, at(s.startedAtMs!)), keyword: s.keyword, text: s.text })),
  };
}

/** Speaking pace for narration: a typical TTS voice, and about how fast a viewer reads a caption. */
const WORDS_PER_MINUTE = 170;

/**
 * Steps whose line ("Given ...") takes longer to say than the step is on screen, so a
 * voiceover would talk over the next step. Words at 170 per minute: an estimate, made
 * before any audio exists. Seeing it here beats hearing it in the render.
 */
export function stepOverruns(
  { steps, durationMs }: Pick<VideoManifest, "steps" | "durationMs">,
  wordsPerMinute = WORDS_PER_MINUTE,
): StepOverrun[] {
  return steps.flatMap((s, i) => {
    const line = `${s.keyword} ${s.text}`;
    const needMs = Math.round((line.trim().split(/\s+/).length / wordsPerMinute) * 60_000);
    const haveMs = (steps[i + 1]?.t ?? durationMs) - s.t;
    return needMs > haveMs ? [{ step: line, needMs, haveMs }] : [];
  });
}

/** Where `--from-step` starts: the step's index, from a number from 1 or a keyword. */
export function fromStepIndex(steps: { keyword: string }[], from: string): number | undefined {
  const i = /^\d+$/.test(from)
    ? Number(from) - 1
    : steps.findIndex((s) => s.keyword.toLowerCase() === from.toLowerCase());
  return i >= 0 && i < steps.length ? i : undefined;
}

/**
 * Stills to check the video against its steps, with ffmpeg: each step's last frame, so a Then
 * shows its outcome, and a third-of-the-frame close-up of the step's last click with a magenta
 * ring on it, at the click. An agent reads these to confirm the video shows what a step claims.
 */
export function frameCommands(
  manifest: VideoManifest,
  video: string,
  dir: string,
): { frames: StepFrame[]; commands: string[][] } {
  const frames: StepFrame[] = [];
  const commands: string[][] = [];
  const name = (i: number, suffix = "") => path.join(dir, `step-${String(i + 1).padStart(2, "0")}${suffix}.jpg`);
  // Never past the last frame: a quick final step can begin after the footage ends.
  const lastMs = Math.max(0, manifest.durationMs - 50);
  const grab = (ms: number, out: string, filter?: string) => [
    "-y", "-loglevel", "error", "-ss", (Math.max(0, Math.min(ms, lastMs)) / 1000).toFixed(3), "-i", video,
    ...(filter ? ["-vf", filter] : []), "-frames:v", "1", "-q:v", "3", out,
  ];
  const { width, height, steps, clicks } = manifest;
  const w = Math.round(width / 3);
  const h = Math.round(height / 3);
  const ring = Math.max(12, Math.round(width * 0.015));

  steps.forEach((s, i) => {
    const end = steps[i + 1]?.t ?? manifest.durationMs;
    // A frame short of the end, so the next step has not begun; never before this step began.
    const frame: StepFrame = { step: `${s.keyword} ${s.text}`, frame: name(i) };
    commands.push(grab(Math.max(s.t, end - 50), frame.frame));
    const click = clicks.filter((c) => c.t >= s.t && c.t < end).at(-1);
    if (click) {
      frame.closeUp = name(i, "-click");
      const x = Math.min(Math.max(0, click.x - w / 2), width - w);
      const y = Math.min(Math.max(0, click.y - h / 2), height - h);
      commands.push(
        grab(
          click.t,
          frame.closeUp,
          `drawbox=x=${click.x - ring}:y=${click.y - ring}:w=${ring * 2}:h=${ring * 2}:color=magenta:t=3,` +
            `crop=${w}:${h}:${Math.round(x)}:${Math.round(y)}`,
        ),
      );
    }
    frames.push(frame);
  });
  return { frames, commands };
}

export async function writeVideos(args: VideoArgs, deps: VideoDeps): Promise<VideoResult> {
  const { testCases, outputDir, trimLeadIn = true, fromStep, frames: withFrames = false } = args;
  const result: VideoResult = { written: [], skipped: [] };
  const used = new Set<string>();

  for (const tc of testCases) {
    const scenario = tc.story.scenario;
    if (tc.status !== "passed") {
      result.skipped.push({ scenario, reason: tc.status });
      continue;
    }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "es-video-"));
    try {
      const input = recordingFile(tc, tmp);
      if (!input) {
        result.skipped.push({ scenario, reason: "no recording (featureVideo)" });
        continue;
      }

      const probe = await deps.exec("ffprobe", [
        "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", input,
      ]);
      const stream = (JSON.parse(probe.stdout) as { streams?: { width: number; height: number }[] }).streams?.[0];
      if (!stream) throw new Error(`${input} has no video stream`);
      // Playwright's WebM has no duration in its header, so the frames give it.
      const stats = await deps.exec("ffmpeg", [
        "-v", "info", "-i", input, "-vf", "negate,blackframe=amount=0:threshold=32", "-f", "null", "-",
      ]);
      const coverage = parseFrames(stats.stderr);
      const lead = trimLeadIn ? leadInSeconds(coverage) : 0;
      const fullMs = ((coverage.at(-1)?.t ?? 0) - lead) * 1000;
      const size = { width: stream.width - (stream.width % 2), height: stream.height - (stream.height % 2) };

      // Starting at a later step cuts everything before it, and drops the steps that came before.
      const leadMs = Math.round(lead * 1000);
      const uncut = videoManifest(tc, { name: "", size, durationMs: fullMs, trimmedMs: leadMs });
      const from = fromStep === undefined ? undefined : fromStepIndex(uncut.steps, fromStep);
      const cutMs = from === undefined ? 0 : uncut.steps[from]!.t;
      if (cutMs >= fullMs) {
        result.skipped.push({ scenario, reason: `--from-step ${fromStep} begins after the recording ends` });
        continue;
      }
      const trimmedMs = leadMs + cutMs;
      const durationMs = fullMs - cutMs;

      let name = scenarioSlug(scenario);
      for (let n = 2; used.has(name); n++) name = `${scenarioSlug(scenario)}-${n}`;
      used.add(name);
      fs.mkdirSync(outputDir, { recursive: true });
      const video = path.join(outputDir, `${name}.mp4`);
      // H.264 in yuv420p plays everywhere, Safari and phones included; it needs even sizes.
      await deps.exec("ffmpeg", [
        "-y", "-loglevel", "error", "-i", input, "-ss", (trimmedMs / 1000).toFixed(3), "-an",
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", video,
      ]);
      const manifest = path.join(outputDir, `${name}.video.json`);
      const written = videoManifest(tc, { name, size, durationMs, trimmedMs });
      if (from !== undefined) written.steps = written.steps.slice(from);
      fs.writeFileSync(manifest, `${JSON.stringify(written, null, 2)}\n`);
      const entry: VideoResult["written"][number] = { scenario, video, manifest, trimmedMs, overruns: stepOverruns(written) };
      if (withFrames) {
        const dir = path.join(outputDir, name);
        fs.rmSync(dir, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
        const { frames, commands } = frameCommands(written, video, dir);
        for (const command of commands) await deps.exec("ffmpeg", command);
        entry.frames = frames;
      }
      result.written.push(entry);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  return result;
}
