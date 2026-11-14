import { execFile, execFileSync, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, expect } from "vitest";
import { ffmpegPath } from "executable-stories-core/utils/ffmpeg-path";
import {
  frameCommands,
  fromStepIndex,
  idleSegments,
  leadInSeconds,
  parseFrames,
  parseFreezes,
  remapTime,
  speedFilter,
  parseVideoSize,
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

const ffmpeg = ffmpegPath(import.meta.url);

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

  it("reads the input's size from ffmpeg's log", () => {
    const log = [
      "  Stream #0:0: Video: vp8, yuv420p(progressive), 1440x900, SAR 1:1 DAR 8:5, 25 fps, 25 tbr, 1k tbn",
      "  Stream #0:0: Video: wrapped_avframe, yuv420p, 640x400, q=2-31",
    ].join("\n");
    expect(parseVideoSize(log)).toEqual({ width: 1440, height: 900 });
    expect(parseVideoSize("  Stream #0:0: Video: h264 (avc1 / 0x31637661), yuv420p(tv, bt709), 320x240")).toEqual({ width: 320, height: 240 });
    expect(parseVideoSize("  Stream #0:0: Audio: opus, 48000 Hz")).toBeUndefined();
  });

  it("skips failing and unrecorded scenarios", async () => {
    const deps: VideoDeps = { ffmpeg: async () => ({ stdout: "", stderr: "" }) };
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "es-video-out-"));
    const { written, skipped } = await writeVideos(
      { testCases: [recorded("broken", "failed", "x.webm"), stubs.testCaseResult({ status: "passed" })], outputDir: out },
      deps,
    );
    expect(written).toEqual([]);
    expect(skipped.map((s) => s.reason)).toEqual(["failed", "no recording (featureVideo)"]);
  });

  it("finds a recording stored relative to the run's projectRoot, whatever the cwd", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-video-root-"));
    fs.mkdirSync(path.join(root, "reports"));
    fs.writeFileSync(path.join(root, "reports/rec.webm"), "webm");
    const inputs: string[] = [];
    const deps: VideoDeps = {
      ffmpeg: async (args) => {
        inputs.push(args[args.indexOf("-i") + 1]!);
        throw new Error("stop after the first read");
      },
    };
    await expect(
      writeVideos(
        { testCases: [recorded("relative", "passed", "reports/rec.webm")], outputDir: path.join(root, "out"), projectRoot: root },
        deps,
      ),
    ).rejects.toThrow("stop after the first read");
    expect(inputs).toEqual([path.join(root, "reports/rec.webm")]);
  });

  it("writes an MP4 with the blank page load cut off, and its manifest", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-video-"));
    const webm = path.join(dir, "in.webm");
    // One second of white page, then a second of content.
    execFileSync(ffmpeg, [
      "-v", "error",
      "-f", "lavfi", "-i", "color=white:s=320x240:d=1:r=25",
      "-f", "lavfi", "-i", "testsrc=s=320x240:d=1:r=25",
      "-filter_complex", "[0][1]concat=n=2", "-c:v", "libvpx", webm,
    ]);
    const deps: VideoDeps = {
      ffmpeg: (args) =>
        new Promise((resolve, reject) =>
          execFile(ffmpeg, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) =>
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

  it("starts at a later step and writes a still per step", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-video-"));
    const webm = path.join(dir, "in.webm");
    // One second of white page, then three of content.
    execFileSync(ffmpeg, [
      "-v", "error",
      "-f", "lavfi", "-i", "color=white:s=320x240:d=1:r=25",
      "-f", "lavfi", "-i", "testsrc=s=320x240:d=3:r=25",
      "-filter_complex", "[0][1]concat=n=2", "-c:v", "libvpx", webm,
    ]);
    const deps: VideoDeps = {
      ffmpeg: (args) =>
        new Promise((resolve, reject) =>
          execFile(ffmpeg, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) =>
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

  it("skips a scenario whose --from-step begins after the recording ends", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-video-"));
    const webm = path.join(dir, "in.webm");
    // Two seconds of content; the When began 2.5s in.
    execFileSync(ffmpeg, ["-v", "error", "-f", "lavfi", "-i", "testsrc=s=320x240:d=2:r=25", "-c:v", "libvpx", webm]);
    const deps: VideoDeps = {
      ffmpeg: (args) =>
        new Promise((resolve, reject) =>
          execFile(ffmpeg, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) =>
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

describe("idle fast-forward", () => {
  it("reads still stretches from freezedetect, closing one still running at the end", () => {
    const log = [
      "[freezedetect @ 0x1] lavfi.freezedetect.freeze_start: 2.04",
      "[freezedetect @ 0x1] lavfi.freezedetect.freeze_duration: 5.96",
      "[freezedetect @ 0x1] lavfi.freezedetect.freeze_end: 8",
      "[freezedetect @ 0x1] lavfi.freezedetect.freeze_start: 9.5",
    ].join("\n");
    expect(parseFreezes(log, 11)).toEqual([
      { start: 2.04, end: 8 },
      { start: 9.5, end: 11 },
    ]);
  });

  it("plays a still stretch in real time for the hold, then fast, and nothing else", () => {
    const segments = idleSegments(
      [
        { from: 1000, to: 7000 },
        // Too short past its hold to be worth a jump.
        { from: 7500, to: 9200 },
      ],
      10_000,
      { speed: 8 },
    );
    expect(segments).toEqual([
      { from: 0, to: 2500, speed: 1 },
      { from: 2500, to: 7000, speed: 8 },
      { from: 7000, to: 10_000, speed: 1 },
    ]);
    expect(remapTime(segments, 2500)).toBe(2500);
    expect(remapTime(segments, 7000)).toBe(3063);
    expect(remapTime(segments, 10_000)).toBe(6063);
  });

  it("does nothing at speed 1", () => {
    expect(idleSegments([{ from: 0, to: 9000 }], 10_000, { speed: 1 })).toEqual([
      { from: 0, to: 10_000, speed: 1 },
    ]);
  });

  it("clips a stretch that runs past the end, and starts a stretch begun before the cut at its hold", () => {
    expect(idleSegments([{ from: -3000, to: 12_000 }], 10_000, { speed: 4 })).toEqual([
      { from: 0, to: 10_000, speed: 4 },
    ]);
  });

  it("builds one graph that trims each segment from the cut and joins them", () => {
    expect(
      speedFilter(
        [
          { from: 0, to: 2500, speed: 1 },
          { from: 2500, to: 7000, speed: 8 },
        ],
        1000,
      ),
    ).toBe(
      "[0:v]trim=start=1.000:end=3.500,setpts=(PTS-STARTPTS)/1[s0];" +
        "[0:v]trim=start=3.500:end=8.000,setpts=(PTS-STARTPTS)/8[s1];" +
        "[s0][s1]concat=n=2:v=1:a=0,scale=trunc(iw/2)*2:trunc(ih/2)*2[out]",
    );
  });

  it("speeds up a cut that is one still stretch end to end, matching its manifest", async () => {
    // --from-step lands 2.5s into an 8s still screen: the whole cut is one fast segment.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-video-"));
    const webm = path.join(dir, "in.webm");
    execFileSync(ffmpeg, ["-v", "error", "-f", "lavfi", "-i", "color=red:s=320x240:d=8:r=25", "-c:v", "libvpx", webm]);
    const deps: VideoDeps = {
      ffmpeg: (args) =>
        new Promise((resolve, reject) =>
          execFile(ffmpeg, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) =>
            err ? reject(err) : resolve({ stdout, stderr })),
        ),
    };
    const { written } = await writeVideos(
      { testCases: [recorded("All still", "passed", webm)], outputDir: path.join(dir, "out"), fromStep: "When" },
      deps,
    );
    const manifest = JSON.parse(fs.readFileSync(written[0].manifest, "utf8"));
    // 5.5s left after the cut, at 8x: about 0.69s.
    expect(manifest.durationMs).toBeGreaterThan(600);
    expect(manifest.durationMs).toBeLessThan(800);
    const probe = spawnSync(ffmpeg, ["-i", written[0].video]).stderr.toString();
    const [, h, m, sec] = /Duration: (\d+):(\d+):([\d.]+)/.exec(probe)!;
    const actualMs = (Number(h) * 3600 + Number(m) * 60 + Number(sec)) * 1000;
    expect(Math.abs(actualMs - manifest.durationMs)).toBeLessThan(120);
  }, 30_000);

  it("writes a video as long as its manifest says, with steps and pages moved onto the faster timeline", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-video-"));
    const webm = path.join(dir, "in.webm");
    // White page 1s (trimmed), content 1s, a still screen 6s (a wait), content 1s.
    execFileSync(ffmpeg, [
      "-v", "error",
      "-f", "lavfi", "-i", "color=white:s=320x240:d=1:r=25",
      "-f", "lavfi", "-i", "testsrc=s=320x240:d=1:r=25",
      "-f", "lavfi", "-i", "color=red:s=320x240:d=6:r=25",
      "-f", "lavfi", "-i", "testsrc=s=320x240:d=1:r=25",
      "-filter_complex", "[0][1][2][3]concat=n=4", "-c:v", "libvpx", webm,
    ]);
    const tc = recorded("Waits for the order", "passed", webm);
    // Recording began at 10s; the cut video starts 1s later.
    tc.story.steps.push({ keyword: "Then", text: "the order is confirmed", startedAtMs: 18_100 });
    tc.story.recording!.pages = [
      { at: 10_050, url: "http://localhost/" },
      { at: 18_100, url: "http://localhost/done" },
    ];
    const deps: VideoDeps = {
      ffmpeg: (args) =>
        new Promise((resolve, reject) =>
          execFile(ffmpeg, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) =>
            err ? reject(err) : resolve({ stdout, stderr })),
        ),
    };
    const out = path.join(dir, "out");
    const { written } = await writeVideos({ testCases: [tc], outputDir: out }, deps);

    const manifest = JSON.parse(fs.readFileSync(written[0].manifest, "utf8"));
    // 8s cut: 1s content + 1.5s hold + 4.5s at 8x + 1s content, about 4.06s.
    expect(manifest.durationMs).toBeGreaterThan(3950);
    expect(manifest.durationMs).toBeLessThan(4200);
    expect(written[0].idleSavedMs).toBeGreaterThan(3800);
    const probe = spawnSync(ffmpeg, ["-i", written[0].video]).stderr.toString();
    const [, h, m, sec] = /Duration: (\d+):(\d+):([\d.]+)/.exec(probe)!;
    const actualMs = (Number(h) * 3600 + Number(m) * 60 + Number(sec)) * 1000;
    expect(Math.abs(actualMs - manifest.durationMs)).toBeLessThan(120);
    // Cut time 7.1s: past the fast stretch, so 4.5s of it became about 0.56s.
    const then = manifest.steps.at(-1);
    expect(then.text).toBe("the order is confirmed");
    expect(then.t).toBeGreaterThan(3050);
    expect(then.t).toBeLessThan(3300);
    expect(manifest.pages).toEqual([
      { t: 0, url: "http://localhost/" },
      { t: then.t, url: "http://localhost/done" },
    ]);
  }, 30_000);
});
