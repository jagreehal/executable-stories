import { execFile, execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, expect } from "vitest";
import {
  frameCommands,
  fromStepIndex,
  leadInSeconds,
  parseFrames,
  stepOverruns,
  videoManifest,
  writeVideos,
  type VideoDeps,
} from "../src/video";
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
          { at: 12_600, x: 640, y: 360, kind: "focus", cover: 0.01234 },
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

describe("fromStepIndex", () => {
  const steps = [{ keyword: "Given" }, { keyword: "Given" }, { keyword: "When" }, { keyword: "Then" }];

  it("takes a step number from 1, or the first step with a keyword", () => {
    expect(fromStepIndex(steps, "2")).toBe(1);
    expect(fromStepIndex(steps, "when")).toBe(2);
  });

  it("finds nothing past the end or for a keyword the scenario lacks", () => {
    expect(fromStepIndex(steps, "9")).toBeUndefined();
    expect(fromStepIndex(steps, "0")).toBeUndefined();
    expect(fromStepIndex(steps, "But")).toBeUndefined();
  });
});

describe("frameCommands", () => {
  const manifest = {
    name: "n", video: "n.mp4", width: 1200, height: 600, durationMs: 4000,
    clicks: [
      { t: 500, x: 100, y: 50, kind: "click" as const },
      { t: 2500, x: 1150, y: 580, kind: "focus" as const },
    ],
    steps: [
      { t: 0, keyword: "Given", text: "the app is open" },
      { t: 2000, keyword: "When", text: "Lena types" },
    ],
  };

  it("grabs each step as it ends, and a ringed close-up of its last click kept inside the frame", () => {
    const { frames, commands } = frameCommands(manifest, "n.mp4", "out");

    expect(frames).toEqual([
      { step: "Given the app is open", frame: path.join("out", "step-01.jpg"), closeUp: path.join("out", "step-01-click.jpg") },
      { step: "When Lena types", frame: path.join("out", "step-02.jpg"), closeUp: path.join("out", "step-02-click.jpg") },
    ]);
    // Step 1 ends where step 2 begins; the frame is taken just before.
    expect(commands[0]).toContain("1.950");
    // Its click at (100, 50): the 400x200 crop is pushed back inside the frame at the top-left corner.
    expect(commands[1].join(" ")).toContain("crop=400:200:0:0");
    // The field at (1150, 580): pushed in from the bottom-right.
    expect(commands[3].join(" ")).toContain("crop=400:200:800:400");
  });

  it("never grabs a short step's still from before it began", () => {
    const short = {
      ...manifest,
      clicks: [],
      steps: [
        { t: 0, keyword: "When", text: "Lena saves" },
        { t: 1000, keyword: "Then", text: "it is saved" },
        { t: 1020, keyword: "And", text: "she sees a toast" },
      ],
    };
    const { commands } = frameCommands(short, "n.mp4", "out");

    // The Then lasts 20ms: end - 50 would be 970ms, inside the When.
    expect(commands[1]).toContain("1.000");
  });

  it("grabs a step that begins after the footage ends from the last frame", () => {
    const late = { ...manifest, clicks: [], steps: [{ t: 4200, keyword: "Then", text: "it is saved" }] };
    expect(frameCommands(late, "n.mp4", "out").commands[0]).toContain("3.950");
  });
});

describe("stepOverruns", () => {
  const steps = [
    { t: 0, keyword: "Given", text: "a customer with an expired card on file" }, // 9 words: ~3.2s
    { t: 1000, keyword: "When", text: "they pay" }, // 3 words: ~1.1s
    { t: 4000, keyword: "Then", text: "the payment is declined" }, // 5 words: ~1.8s
  ];

  it("names the steps whose line takes longer to say than they are on screen", () => {
    expect(stepOverruns({ steps, durationMs: 6000 })).toEqual([
      { step: "Given a customer with an expired card on file", needMs: 3176, haveMs: 1000 },
    ]);
  });

  it("counts the last step to the end of the video", () => {
    expect(stepOverruns({ steps, durationMs: 4500 }).map((o) => o.step)).toContain("Then the payment is declined");
  });
});

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
    expect(manifest.clicks).toEqual([{ t: 1600, x: 320, y: 180, kind: "focus", cover: 0.012 }]);
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

  it("measures cover against the video, so a page padded inside it covers less", () => {
    const tc = recorded("Phone", "passed", "x.webm");
    tc.story.recording = {
      startedAtMs: 10_000,
      viewport: { width: 375, height: 667 },
      attention: [{ at: 11_000, x: 187, y: 333, kind: "click", cover: 0.8 }],
    };
    const { clicks } = videoManifest(tc, { name: "phone", size: { width: 1280, height: 720 }, durationMs: 5000, trimmedMs: 0 });
    // Most of the phone's page, but 375x667 is only 27% of a 1280x720 video: zoom still worth having.
    expect(clicks[0]?.cover).toBe(0.217);
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

  it.skipIf(!hasFfmpeg)("starts at a later step and writes a still per step", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-video-"));
    const webm = path.join(dir, "in.webm");
    // One second of white page, then three of content.
    execFileSync("ffmpeg", [
      "-v", "error",
      "-f", "lavfi", "-i", "color=white:s=320x240:d=1:r=25",
      "-f", "lavfi", "-i", "testsrc=s=320x240:d=3:r=25",
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
    const { written } = await writeVideos(
      { testCases: [recorded("Lena's sign-up", "passed", webm)], outputDir: out, fromStep: "When", frames: true },
      deps,
    );

    // The When began 2.5s into the recording: 1s of blank page, then 1.5s of Given, both cut.
    expect(written[0].trimmedMs).toBe(2500);
    const manifest = JSON.parse(fs.readFileSync(written[0].manifest, "utf8"));
    expect(manifest.steps).toEqual([{ t: 0, keyword: "When", text: "Lena types her name" }]);
    expect(manifest.clicks).toMatchObject([{ t: 100, kind: "focus" }]);
    expect(manifest.durationMs).toBeGreaterThan(1400);
    expect(manifest.durationMs).toBeLessThan(1600);
    expect(written[0].frames).toEqual([
      {
        step: "When Lena types her name",
        frame: path.join(out, "lenas-sign-up", "step-01.jpg"),
        closeUp: path.join(out, "lenas-sign-up", "step-01-click.jpg"),
      },
    ]);
    for (const f of [written[0].frames![0].frame, written[0].frames![0].closeUp!]) expect(fs.statSync(f).size).toBeGreaterThan(0);
  }, 30_000);

  it.skipIf(!hasFfmpeg)("skips a scenario whose --from-step begins after the recording ends", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-video-"));
    const webm = path.join(dir, "in.webm");
    // Two seconds of content; the When began 2.5s in.
    execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc=s=320x240:d=2:r=25", "-c:v", "libvpx", webm]);
    const deps: VideoDeps = {
      exec: (command, args) =>
        new Promise((resolve, reject) =>
          execFile(command, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) =>
            err ? reject(err) : resolve({ stdout, stderr })),
        ),
    };
    const { written, skipped } = await writeVideos(
      { testCases: [recorded("Late", "passed", webm)], outputDir: path.join(dir, "out"), fromStep: "When" },
      deps,
    );

    expect(written).toEqual([]);
    expect(skipped).toEqual([{ scenario: "Late", reason: "--from-step When begins after the recording ends" }]);
  }, 30_000);
});
