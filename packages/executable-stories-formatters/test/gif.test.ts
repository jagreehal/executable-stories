import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as zlib from "node:zlib";
import { describe, it, expect } from "vitest";
import { pngSize, writeGifs, type GifDeps } from "../src/gif";
import { stubs } from "./stubs";

/** A solid-colour RGB PNG, built by hand so the test needs no image library. */
function png(width: number, height: number, rgb: [number, number, number]): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => rgb).flat())]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const shot = (p: Buffer) => ({ kind: "screenshot" as const, path: `data:image/png;base64,${p.toString("base64")}` });

const scenario = (name: string, status: "passed" | "failed", frames: Buffer[]) =>
  stubs.testCaseResult({
    status,
    story: stubs.storyMeta({
      scenario: name,
      steps: frames.map((f, i) => ({ keyword: "Given", text: `step ${i}`, docs: [shot(f)] })),
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

describe("gif", () => {
  it("reads PNG dimensions from the header", () => {
    expect(pngSize(png(7, 3, [0, 0, 0]))).toEqual({ width: 7, height: 3 });
  });

  it("makes one GIF per passing scenario with two or more screenshots", async () => {
    const calls: string[][] = [];
    const deps: GifDeps = { ffmpeg: async (args) => void calls.push(args) };
    const red = png(4, 4, [255, 0, 0]);
    const tall = png(4, 9, [0, 0, 255]);

    const result = await writeGifs(
      {
        testCases: [
          scenario("Place an order", "passed", [red, tall]),
          scenario("Place an order", "passed", [red, red]),
          scenario("Failed checkout", "failed", [red, red]),
          scenario("One frame", "passed", [red]),
        ],
        outputDir: path.join(os.tmpdir(), "es-gif-test"),
      },
      deps,
    );

    expect(result.written.map((w) => path.basename(w.path))).toEqual(["place-an-order.gif", "place-an-order-2.gif"]);
    expect(result.skipped.map((s) => s.scenario)).toEqual(["Failed checkout", "One frame"]);
    // Mixed sizes are padded to the largest frame.
    expect(calls[0].join(" ")).toContain("pad=4:9:0:0:white");
  });

  it.skipIf(!hasFfmpeg)("writes a real animated GIF with ffmpeg", async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "es-gif-real-"));
    const ffmpeg: GifDeps["ffmpeg"] = async (args) => void execFileSync("ffmpeg", args, { stdio: "ignore" });

    const { written } = await writeGifs(
      {
        testCases: [scenario("Walkthrough", "passed", [png(16, 16, [255, 0, 0]), png(16, 16, [0, 0, 255])])],
        outputDir,
      },
      { ffmpeg },
    );

    const gif = fs.readFileSync(written[0].path);
    expect(gif.subarray(0, 6).toString()).toBe("GIF89a");
    expect(gif.includes(Buffer.from("NETSCAPE2.0"))).toBe(true); // loops
    fs.rmSync(outputDir, { recursive: true, force: true });
  });
});
