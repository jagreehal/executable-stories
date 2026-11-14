import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { ffmpegPath } from "executable-stories-core/utils/ffmpeg-path";
import { backgroundArgs, barText, findFont, frameFilter, frameLayout, parseBackground, writeUrlFiles } from "../src/video-frame";
import type { VideoManifest } from "../src/video";

const ffmpeg = ffmpegPath(import.meta.url);

const manifest: VideoManifest = {
  name: "checkout",
  video: "checkout.mp4",
  width: 640,
  height: 360,
  durationMs: 2000,
  clicks: [
    { t: 500, x: 100, y: 100, kind: "click" },
    { t: 1500, x: 500, y: 300, kind: "click", touch: true },
    { t: 1800, x: 50, y: 50, kind: "focus" },
  ],
  steps: [],
  pages: [
    { t: 0, url: "http://localhost:5173/" },
    { t: 1000, url: "http://localhost:5173/checkout" },
  ],
};

describe("frame layout and options", () => {
  it("adds a title bar and even padding, keeping every size even", () => {
    // The bar never goes under 24px, however narrow the recording.
    expect(frameLayout(manifest)).toEqual({ width: 640 + 2 * 38, height: 360 + 24 + 2 * 38, bar: 24, padding: 38 });
    const layout = frameLayout({ width: 1280, height: 720 });
    for (const n of Object.values(layout)) expect(n % 2).toBe(0);
  });

  it("takes one hex colour or two for a gradient, and nothing else", () => {
    expect(parseBackground("#112233")).toEqual({ from: "0x112233" });
    expect(parseBackground("112233, #445566")).toEqual({ from: "0x112233", to: "0x445566" });
    expect(parseBackground("red")).toBeUndefined();
    expect(parseBackground("#112233,#445566,#778899")).toBeUndefined();
    expect(() => backgroundArgs(manifest, "red", "/bg.png")).toThrow(/#rrggbb/);
  });

  it("shows the address without its scheme, cut to fit", () => {
    expect(barText("https://shop.example.com/a", 400, 10)).toBe("shop.example.com/a");
    expect(barText("http://localhost/" + "x".repeat(100), 110, 10)).toBe("localhost/xxxxxxxxx…");
  });

  it("finds the first font that exists", () => {
    expect(findFont(["/nope.ttf", "/yes.ttf"], (f) => f === "/yes.ttf")).toBe("/yes.ttf");
    expect(findFont(["/nope.ttf"], () => false)).toBeUndefined();
  });

  it("marks clicks and taps but not focused fields, and switches the address with the page", () => {
    const graph = frameFilter(manifest, { fontFile: "/f.ttf", urlFiles: ["/a.txt", "/b.txt"] });
    expect(graph.match(/\[ring\d+\]overlay/g)).toHaveLength(1);
    expect(graph.match(/\[tap\d+\]overlay/g)).toHaveLength(1);
    expect(graph).toContain("enable='between(t,0.420,0.950)'");
    expect(graph).toContain("textfile='/a.txt'");
    expect(graph).toContain("enable='between(t,0.000,1.000)'");
    expect(graph).toContain("enable='between(t,1.000,3.000)'");
    expect(frameFilter(manifest)).not.toContain("drawtext");
  });
});

describe("framing a real video", () => {
  /** One frame of `file` at `sec`, as RGB24 pixels. */
  const frameAt = (file: string, sec: number) =>
    execFileSync(ffmpeg, ["-v", "error", "-ss", String(sec), "-i", file, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  const pixel = (buf: Buffer, width: number, x: number, y: number) => {
    const i = (y * width + x) * 3;
    return [buf[i]!, buf[i + 1]!, buf[i + 2]!];
  };
  const near = (a: number[], b: number[], tolerance = 24) => a.every((v, i) => Math.abs(v - b[i]!) <= tolerance);

  it("draws the bar, the background and a ring on the click, at the manifest's size", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-frame-"));
    const input = path.join(dir, "in.mp4");
    execFileSync(ffmpeg, ["-v", "error", "-f", "lavfi", "-i", "color=c=0x808080:s=640x360:d=2:r=25", "-pix_fmt", "yuv420p", input]);
    const font = findFont();
    const out = path.join(dir, "out.mp4");
    const backdrop = path.join(dir, "bg.png");
    execFileSync(ffmpeg, backgroundArgs(manifest, "#204060", backdrop));
    execFileSync(ffmpeg, [
      "-v", "error", "-i", input, "-loop", "1", "-i", backdrop, "-filter_complex",
      frameFilter(manifest, font ? { fontFile: font, urlFiles: writeUrlFiles(manifest, dir) } : {}),
      "-map", "[out]", "-c:v", "libx264", "-pix_fmt", "yuv420p", out,
    ]);

    const { width, height, bar, padding } = frameLayout(manifest);
    const at = frameAt(out, 0.5);
    expect(at.length).toBe(width * height * 3);
    // Background in the padding, the bar's grey above the recording, the recording itself.
    expect(near(pixel(at, width, 4, 4), [0x20, 0x40, 0x60])).toBe(true);
    expect(near(pixel(at, width, padding + 300, padding + 2), [0xe8, 0xe8, 0xec])).toBe(true);
    expect(near(pixel(at, width, padding + 300, padding + bar + 200), [0x80, 0x80, 0x80])).toBe(true);
    // The ring (36px across here) crosses the click's row 0.5s in, and is gone by 1.2s.
    const rimX = padding + 100 + 15;
    const rimY = padding + bar + 100;
    expect(near(pixel(at, width, rimX, rimY), [0x80, 0x80, 0x80])).toBe(false);
    expect(near(pixel(frameAt(out, 1.2), width, rimX, rimY), [0x80, 0x80, 0x80])).toBe(true);
  }, 60_000);

  it("holds a steady gradient behind the window", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-frame-"));
    const input = path.join(dir, "in.mp4");
    execFileSync(ffmpeg, ["-v", "error", "-f", "lavfi", "-i", "color=c=0x808080:s=640x360:d=2:r=25", "-pix_fmt", "yuv420p", input]);
    const out = path.join(dir, "out.mp4");
    const backdrop = path.join(dir, "bg.png");
    execFileSync(ffmpeg, backgroundArgs(manifest, "#0f172a,#334155", backdrop));
    execFileSync(ffmpeg, ["-v", "error", "-i", input, "-loop", "1", "-i", backdrop, "-filter_complex", frameFilter(manifest), "-map", "[out]", "-c:v", "libx264", "-pix_fmt", "yuv420p", out]);
    const { width } = frameLayout(manifest);
    // The default runs #0f172a (top-left) to #334155 (bottom-right), the same in every frame.
    const first = pixel(frameAt(out, 0.1), width, 2, 2);
    expect(near(first, [0x0f, 0x17, 0x2a])).toBe(true);
    expect(near(pixel(frameAt(out, 1.9), width, 2, 2), first, 2)).toBe(true);
  }, 60_000);
});
