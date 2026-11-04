import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { ffmpegPath } from "./ffmpeg-path";

describe("ffmpegPath", () => {
  it("prefers FFMPEG_PATH over the installed package", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-ffmpeg-"));
    const from = path.join(root, "index.js");
    const pkg = path.join(root, "node_modules/@ffmpeg-installer/ffmpeg");
    fs.mkdirSync(pkg, { recursive: true });
    fs.writeFileSync(path.join(pkg, "index.js"), 'module.exports = { path: "/bundled/ffmpeg" };');
    expect(ffmpegPath(from, {})).toBe("/bundled/ffmpeg");
    expect(ffmpegPath(from, { FFMPEG_PATH: "/mine/ffmpeg" })).toBe("/mine/ffmpeg");
  });
});
