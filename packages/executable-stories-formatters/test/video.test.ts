import { execFile, execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, expect } from "vitest";
import { leadInSeconds, parseFrames, videoManifest, writeVideos, type VideoDeps } from "../src/video";
import { stubs } from "./stubs";

const recorded = (name: string, status: "passed" | "failed", file: string) =>
  stubs.testCaseResult({
    status,
    attachments: [{ name: "video", mediaType: "video/webm", body: file, contentEncoding: "IDENTITY", external: true }],
    story: stubs.storyMeta({
      scenario: name,
      startedAtMs: 10_000,
      steps: [
        { keyword: "Given", text: "the app is open", startedAtMs: 10_100 },
        { keyword: "When", text: "Lena types her name", startedAtMs: 12_500 },
      ],
      recording: {
        startedAtMs: 10_000,
        viewport: { width: 1280, height: 720 },
        attention: [
          { at: 10_500, x: 100, y: 100, kind: "click" },
          { at: 12_600, x: 640, y: 360, kind: "focus" },
        ],
      },
    }),
  });

const hasFfmpeg = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe("video", () => {
  it("reads how much of each frame is blank page from ffmpeg's blackframe log", () => {
    const log = [
      "[Parsed_blackframe_1 @ 0x1] frame:0 pblack:100 pts:0 t:0.000000 type:I last_keyframe:0",
      "[Parsed_blackframe_1 @ 0x1] frame:1 pblack:93 pts:40 t:0.040000 type:P last_keyframe:0",
    ].join("\n");
    expect(parseFrames(log)).toEqual([
      { t: 0, white: 100 },
      { t: 0.04, white: 93 },
    ]);
  });

  it("ends the lead-in at the first frame with the app on it, not a cursor over a blank page", () => {
    expect(leadInSeconds([{ t: 0, white: 100 }, { t: 0.04, white: 99 }, { t: 0.28, white: 93 }])).toBe(0.28);
    expect(leadInSeconds([{ t: 0, white: 40 }])).toBe(0);
  });

  it("times clicks and steps from the trimmed start, in video pixels", () => {
    const manifest = videoManifest(recorded("Lena signs up", "passed", "x.webm"), {
      name: "lena-signs-up",
      size: { width: 640, height: 360 },
      durationMs: 5000,
      trimmedMs: 1000,
    });
    expect(manifest).toMatchObject({ name: "lena-signs-up", description: "Lena signs up", video: "lena-signs-up.mp4" });
    // The click before the trim is gone; the focus is 12.6s - 10s - 1s in, at half scale.
    expect(manifest.clicks).toEqual([{ t: 1600, x: 320, y: 180, kind: "focus" }]);
    // A step that began during the page load starts the video.
    expect(manifest.steps).toEqual([
      { t: 0, keyword: "Given", text: "the app is open" },
      { t: 1500, keyword: "When", text: "Lena types her name" },
    ]);
  });

  it("scales a portrait viewport by height when it is fitted into a landscape video", () => {
    const tc = recorded("Portrait", "passed", "x.webm");
    tc.story.recording = {
      startedAtMs: 10_000,
      viewport: { width: 400, height: 800 },
      attention: [{ at: 11_000, x: 200, y: 700, kind: "click" }],
    };
    const { clicks } = videoManifest(tc, { name: "portrait", size: { width: 800, height: 600 }, durationMs: 5000, trimmedMs: 0 });
    // 0.75 (600 / 800), not 2 (800 / 400), which would put the click off the bottom of the video.
    expect(clicks).toEqual([{ t: 1000, x: 150, y: 525, kind: "click" }]);
  });

  it("keeps a viewport smaller than the video at 1:1, as Playwright does not scale up", () => {
    const tc = recorded("Phone", "passed", "x.webm");
    tc.story.recording = {
      startedAtMs: 10_000,
      viewport: { width: 375, height: 667 },
      attention: [{ at: 11_000, x: 281, y: 500, kind: "click" }],
    };
    const { clicks } = videoManifest(tc, { name: "phone", size: { width: 1280, height: 720 }, durationMs: 5000, trimmedMs: 0 });
    expect(clicks).toEqual([{ t: 1000, x: 281, y: 500, kind: "click" }]);
  });

  it("scales each point by the viewport it happened in, after the test resizes the page", () => {
    const tc = recorded("Resized", "passed", "x.webm");
    tc.story.recording = {
      startedAtMs: 10_000,
      viewport: { width: 1280, height: 720 },
      attention: [
        { at: 11_000, x: 960, y: 540, kind: "click", viewport: { width: 1280, height: 720 } },
        { at: 12_000, x: 281, y: 500, kind: "click", viewport: { width: 375, height: 667 } },
      ],
    };
    // Measured from a real recording: 1280x720 → 375x667 in Playwright's default 800x450 video.
    const { clicks } = videoManifest(tc, { name: "resized", size: { width: 800, height: 450 }, durationMs: 5000, trimmedMs: 0 });
    expect(clicks.map(({ x, y }) => [x, y])).toEqual([[600, 338], [190, 337]]);
  });

  it("skips failing and unrecorded scenarios", async () => {
    const deps: VideoDeps = { exec: async () => ({ stdout: "", stderr: "" }) };
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "es-video-out-"));
    const { written, skipped } = await writeVideos(
      { testCases: [recorded("broken", "failed", "x.webm"), stubs.testCaseResult({ status: "passed" })], outputDir: out },
      deps,
    );
    expect(written).toEqual([]);
    expect(skipped.map((s) => s.reason)).toEqual(["failed", "no recording (featureVideo)"]);
  });

  it.skipIf(!hasFfmpeg)("writes an MP4 with the blank page load cut off, and its manifest", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-video-"));
    const webm = path.join(dir, "in.webm");
    // One second of white page, then a second of content.
    execFileSync("ffmpeg", [
      "-v", "error",
      "-f", "lavfi", "-i", "color=white:s=320x240:d=1:r=25",
      "-f", "lavfi", "-i", "testsrc=s=320x240:d=1:r=25",
      "-filter_complex", "[0][1]concat=n=2", "-c:v", "libvpx", webm,
    ]);
    const deps: VideoDeps = {
      exec: (command, args) =>
        new Promise((resolve, reject) =>
          execFile(command, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) =>
            err ? reject(err) : resolve({ stdout, stderr })),
        ),
    };
    const out = path.join(dir, "out");
    const { written } = await writeVideos({ testCases: [recorded("Lena's sign-up", "passed", webm)], outputDir: out }, deps);

    expect(written).toHaveLength(1);
    expect(written[0].trimmedMs).toBe(1000);
    expect(fs.existsSync(path.join(out, "lenas-sign-up.mp4"))).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(path.join(out, "lenas-sign-up.video.json"), "utf8"));
    expect(manifest).toMatchObject({ width: 320, height: 240, video: "lenas-sign-up.mp4" });
    expect(manifest.durationMs).toBeGreaterThan(900);
    expect(manifest.durationMs).toBeLessThan(1100);
  }, 30_000);
});
