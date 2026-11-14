/**
 * MP4s from a run's screen recordings (fn(args, deps) pattern): one per passing
 * scenario that Playwright recorded (`story.init(..., { featureVideo: true })`),
 * with the blank page load cut off the start, and a `<name>.video.json` manifest
 * beside it that executable-stories-remotion reads: size, length, each click and
 * focused field, and when each step began.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { TestCaseResult } from "executable-stories-core/types/test-result";
import { scenarioSlug } from "executable-stories-core/utils/slug";
import {
  backgroundArgs,
  DEFAULT_FRAME_BACKGROUND,
  findFont,
  frameFilter,
  parseBackground,
  writeUrlFiles,
} from "./video-frame";

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
  /** The run's `projectRoot`: a recording too large to embed is stored relative to it, not to the cwd. */
  projectRoot?: string;
  /**
   * How much faster to play a stretch where the picture does not change (a wait on the
   * network, a spinner, a long read), past its first `IDLE_HOLD_MS`. Default 8; 1 plays
   * everything in real time.
   */
  idleSpeed?: number;
  /**
   * Also write `<name>.framed.mp4`: click rings (fingertips for taps), a browser title bar with
   * the page's address, and a padded background. For videos that never go through Remotion.
   */
  frame?: boolean;
  /** `--frame` background: "#rrggbb", or "#rrggbb,#rrggbb" for a gradient. */
  frameBackground?: string;
  /** A font for the title bar's address; found on the machine when not given. */
  fontFile?: string;
}

export interface VideoDeps {
  /** Runs ffmpeg; resolves with its output, rejects when it fails or is missing. */
  ffmpeg(args: string[]): Promise<{ stdout: string; stderr: string }>;
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
  clicks: { t: number; x: number; y: number; kind: "click" | "focus"; cover?: number; touch?: boolean }[];
  /** Each step, from when it began: ms into the video. Steps before the trim start at 0. */
  steps: { t: number; keyword: string; text: string }[];
  /** Each address the page showed, from when it showed it: ms into the video. The first is at 0. */
  pages?: { t: number; url: string }[];
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
    /** Real-time ms the idle fast-forward took out; 0 when nothing was still for long. */
    idleSavedMs: number;
    /** `<name>.framed.mp4`, with `--frame`. */
    framed?: string;
    overruns: StepOverrun[];
    frames?: StepFrame[];
  }[];
  /** Scenarios left out, with why: not passing, or not recorded. */
  skipped: { scenario: string; reason: string }[];
  /** What `--frame` could not do on this machine (no font, an ffmpeg without drawtext). */
  warnings?: string[];
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

/** The input's size, from the stream line of ffmpeg's log: `Video: vp8, yuv420p, 1440x900, ...`. */
export function parseVideoSize(log: string): { width: number; height: number } | undefined {
  const m = /Stream #.*Video:.*?, (\d+)x(\d+)/.exec(log);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : undefined;
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

/** A still stretch is played in real time for this long, so an outcome lands before it speeds up. */
export const IDLE_HOLD_MS = 1500;
/** Shorter fast-forwards than this are not worth the jump. */
const IDLE_MIN_MS = 500;

/**
 * Still stretches from ffmpeg's `freezedetect` log, in seconds of the input. A stretch still
 * running when the input ends has no `freeze_end`, so it ends at `endS`.
 */
export function parseFreezes(log: string, endS: number): { start: number; end: number }[] {
  const starts = [...log.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...log.matchAll(/freeze_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  return starts.map((start, i) => ({ start, end: ends[i] ?? endS }));
}

/** A stretch of the cut video's timeline (ms) and how fast it plays. */
export interface Segment {
  from: number;
  to: number;
  speed: number;
}

/**
 * The cut video's timeline as segments: real time, except each still stretch past its first
 * `holdMs`, which plays `speed` times faster. Covers `[0, durationMs]` without gaps.
 */
export function idleSegments(
  still: { from: number; to: number }[],
  durationMs: number,
  { speed, holdMs = IDLE_HOLD_MS }: { speed: number; holdMs?: number },
): Segment[] {
  const segments: Segment[] = [];
  let at = 0;
  if (speed > 1) {
    for (const { from, to } of [...still].sort((a, b) => a.from - b.from)) {
      const fast = Math.max(at, from + holdMs);
      const end = Math.min(to, durationMs);
      if (end - fast < IDLE_MIN_MS) continue;
      if (fast > at) segments.push({ from: at, to: fast, speed: 1 });
      segments.push({ from: fast, to: end, speed });
      at = end;
    }
  }
  if (at < durationMs || segments.length === 0) segments.push({ from: at, to: durationMs, speed: 1 });
  return segments;
}

/** Where `ms` of the cut video lands once its segments play at their speeds. */
export function remapTime(segments: Segment[], ms: number): number {
  let out = 0;
  for (const s of segments) {
    if (ms <= s.from) break;
    out += (Math.min(ms, s.to) - s.from) / s.speed;
  }
  return Math.round(out);
}

/** The recording a scenario carries, as a file path; inline (small) recordings are written to `tmp`. */
function recordingFile(tc: TestCaseResult, tmp: string, projectRoot = ""): string | undefined {
  const att = tc.attachments.find((a) => a.mediaType.startsWith("video/"));
  if (!att) return undefined;
  if (att.external || att.contentEncoding === "IDENTITY") {
    const file = path.resolve(projectRoot, att.body);
    return fs.existsSync(file) ? file : undefined;
  }
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
  {
    name,
    size,
    durationMs,
    trimmedMs,
    remap = (ms) => ms,
  }: {
    name: string;
    size: { width: number; height: number };
    /** Of the output video, after any remap. */
    durationMs: number;
    trimmedMs: number;
    /** Maps a time in the cut video to the output, when idle stretches were sped up. */
    remap?: (ms: number) => number;
  },
): VideoManifest {
  const recording = tc.story.recording;
  const origin = recording?.startedAtMs;
  const cut = (ms: number) => ms - (origin ?? 0) - trimmedMs;
  // Before the cut there is no footage, so those points pin to 0 rather than through the remap.
  const at = (ms: number) => Math.round(cut(ms) < 0 ? cut(ms) : remap(cut(ms)));
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
                ...(p.touch ? { touch: true } : {}),
              };
            })
            .filter((c) => c.t >= 0 && c.t <= durationMs && c.x >= 0 && c.y >= 0 && c.x < size.width && c.y < size.height),
    steps:
      origin === undefined
        ? []
        : tc.story.steps
            .filter((s) => s.startedAtMs !== undefined)
            .map((s) => ({ t: Math.max(0, at(s.startedAtMs!)), keyword: s.keyword, text: s.text })),
    ...(origin !== undefined && recording?.pages?.length ? { pages: pagesAt(recording.pages, at, durationMs) } : {}),
  };
}

/** The address showing at each moment: the last one before the cut shows from 0. */
function pagesAt(
  pages: { at: number; url: string }[],
  at: (ms: number) => number,
  durationMs: number,
): { t: number; url: string }[] {
  const out: { t: number; url: string }[] = [];
  for (const p of pages) {
    const t = Math.max(0, at(p.at));
    if (t > durationMs) break;
    if (out.at(-1)?.t === t) out.pop();
    out.push({ t, url: p.url });
  }
  return out;
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
  const {
    testCases,
    outputDir,
    trimLeadIn = true,
    fromStep,
    frames: withFrames = false,
    projectRoot,
    idleSpeed = 8,
    frame = false,
    frameBackground,
  } = args;
  const result: VideoResult = { written: [], skipped: [] };
  // The address needs drawtext (libfreetype) and a font; without either, the bar still frames.
  let fontFile: string | undefined;
  if (frame) {
    if (frameBackground !== undefined && !parseBackground(frameBackground)) {
      throw new Error(`--frame-background must be "#rrggbb" or "#rrggbb,#rrggbb", got "${frameBackground}"`);
    }
    const filters = await deps.ffmpeg(["-hide_banner", "-filters"]).catch(() => ({ stdout: "", stderr: "" }));
    const hasDrawtext = /\bdrawtext\b/.test(filters.stdout + filters.stderr);
    fontFile = args.fontFile ?? findFont();
    if (!hasDrawtext) {
      result.warnings = ["--frame: this ffmpeg has no drawtext filter (built without libfreetype), so the title bar shows no address"];
      fontFile = undefined;
    } else if (!fontFile) {
      result.warnings = ["--frame: no font found for the title bar's address; it is left out"];
    }
  }
  const used = new Set<string>();

  for (const tc of testCases) {
    const scenario = tc.story.scenario;
    if (tc.status !== "passed") {
      result.skipped.push({ scenario, reason: tc.status });
      continue;
    }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "es-video-"));
    try {
      const input = recordingFile(tc, tmp, projectRoot);
      if (!input) {
        result.skipped.push({ scenario, reason: "no recording (featureVideo)" });
        continue;
      }

      // Playwright's WebM has no duration in its header, so the frames give it.
      const stats = await deps.ffmpeg([
        // freezedetect finds the still stretches the idle fast-forward plays faster; its noise floor
        // lets a small spinner count as still, which is the wait it is there to shorten.
        "-v", "info", "-i", input, "-vf",
        `negate,blackframe=amount=0:threshold=32,freezedetect=n=0.003:d=${(IDLE_HOLD_MS + IDLE_MIN_MS) / 1000}`,
        "-f", "null", "-",
      ]);
      const stream = parseVideoSize(stats.stderr);
      if (!stream) throw new Error(`${input} has no video stream`);
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
      const cutDurationMs = fullMs - cutMs;
      const still = parseFreezes(stats.stderr, coverage.at(-1)?.t ?? 0).map((f) => ({
        from: f.start * 1000 - trimmedMs,
        to: f.end * 1000 - trimmedMs,
      }));
      const segments = idleSegments(still, cutDurationMs, { speed: idleSpeed });
      const durationMs = remapTime(segments, cutDurationMs);

      let name = scenarioSlug(scenario);
      for (let n = 2; used.has(name); n++) name = `${scenarioSlug(scenario)}-${n}`;
      used.add(name);
      fs.mkdirSync(outputDir, { recursive: true });
      const video = path.join(outputDir, `${name}.mp4`);
      // H.264 in yuv420p plays everywhere, Safari and phones included; it needs even sizes.
      const encode = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", video];
      await deps.ffmpeg(
        // Only a single real-time segment can skip the graph: a recording that is all one still
        // stretch is a single segment too, and it must still play at its speed.
        segments.length === 1 && segments[0]!.speed === 1
          ? [
              "-y", "-loglevel", "error", "-i", input, "-ss", (trimmedMs / 1000).toFixed(3), "-an",
              "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", ...encode,
            ]
          : ["-y", "-loglevel", "error", "-i", input, "-an", "-filter_complex", speedFilter(segments, trimmedMs), "-map", "[out]", ...encode],
      );
      const manifest = path.join(outputDir, `${name}.video.json`);
      const written = videoManifest(tc, {
        name,
        size,
        durationMs,
        trimmedMs,
        remap: (ms) => remapTime(segments, ms),
      });
      if (from !== undefined) written.steps = written.steps.slice(from);
      fs.writeFileSync(manifest, `${JSON.stringify(written, null, 2)}\n`);
      const entry: VideoResult["written"][number] = {
        scenario,
        video,
        manifest,
        trimmedMs,
        idleSavedMs: Math.round(cutDurationMs - durationMs),
        overruns: stepOverruns(written),
      };
      if (frame) {
        entry.framed = path.join(outputDir, `${name}.framed.mp4`);
        const backdrop = path.join(tmp, "background.png");
        await deps.ffmpeg(backgroundArgs(written, frameBackground ?? DEFAULT_FRAME_BACKGROUND, backdrop));
        await deps.ffmpeg([
          "-y", "-loglevel", "error", "-i", video, "-loop", "1", "-i", backdrop, "-filter_complex",
          frameFilter(written, fontFile ? { fontFile, urlFiles: writeUrlFiles(written, tmp) } : {}),
          "-map", "[out]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", entry.framed,
        ]);
      }
      if (withFrames) {
        const dir = path.join(outputDir, name);
        fs.rmSync(dir, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
        const { frames, commands } = frameCommands(written, video, dir);
        for (const command of commands) await deps.ffmpeg(command);
        entry.frames = frames;
      }
      result.written.push(entry);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  return result;
}

/**
 * One ffmpeg graph that plays each segment of the input, from `offsetMs`, at its speed and
 * joins them. Trim is frame-exact, so the joins land where the manifest says they do.
 */
export function speedFilter(segments: Segment[], offsetMs: number): string {
  const sec = (ms: number) => ((ms + offsetMs) / 1000).toFixed(3);
  const parts = segments.map(
    (s, i) => `[0:v]trim=start=${sec(s.from)}:end=${sec(s.to)},setpts=(PTS-STARTPTS)/${s.speed}[s${i}]`,
  );
  const inputs = segments.map((_, i) => `[s${i}]`).join("");
  return `${parts.join(";")};${inputs}concat=n=${segments.length}:v=1:a=0,scale=trunc(iw/2)*2:trunc(ih/2)*2[out]`;
}
