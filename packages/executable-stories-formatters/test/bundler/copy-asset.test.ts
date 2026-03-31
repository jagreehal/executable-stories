import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { copyAsset } from "../../src/bundler/copy-asset";

describe("copyAsset", () => {
  let tmpDir: string;
  let assetsDir: string;
  let sourceFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "es-copy-asset-"));
    assetsDir = path.join(tmpDir, "assets");
    sourceFile = path.join(tmpDir, "video.webm");
    fs.writeFileSync(sourceFile, "fake video content");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("copies file to assets dir with hashed name", () => {
    const result = copyAsset(sourceFile, assetsDir);
    expect(result).toMatch(/^assets\/video-[a-f0-9]{8}\.webm$/);
    const destPath = path.join(tmpDir, result);
    expect(fs.existsSync(destPath)).toBe(true);
    expect(fs.readFileSync(destPath, "utf8")).toBe("fake video content");
  });

  it("creates assets directory if it does not exist", () => {
    expect(fs.existsSync(assetsDir)).toBe(false);
    copyAsset(sourceFile, assetsDir);
    expect(fs.existsSync(assetsDir)).toBe(true);
  });

  it("returns same path for same file content (idempotent)", () => {
    const result1 = copyAsset(sourceFile, assetsDir);
    const result2 = copyAsset(sourceFile, assetsDir);
    expect(result1).toBe(result2);
  });

  it("returns different paths for different file content", () => {
    const otherFile = path.join(tmpDir, "other.webm");
    fs.writeFileSync(otherFile, "different content");
    const result1 = copyAsset(sourceFile, assetsDir);
    const result2 = copyAsset(otherFile, assetsDir);
    expect(result1).not.toBe(result2);
  });

  it("preserves file extension", () => {
    const pngFile = path.join(tmpDir, "screenshot.png");
    fs.writeFileSync(pngFile, "fake png");
    const result = copyAsset(pngFile, assetsDir);
    expect(result).toMatch(/\.png$/);
  });

  it("sanitizes filenames with special characters", () => {
    const weirdFile = path.join(tmpDir, "my file (1) [test].webm");
    fs.writeFileSync(weirdFile, "content");
    const result = copyAsset(weirdFile, assetsDir);
    expect(result).not.toMatch(/[\s()[\]]/);
    expect(result).toMatch(/^assets\/my-file-1-test-[a-f0-9]{8}\.webm$/);
  });
});
