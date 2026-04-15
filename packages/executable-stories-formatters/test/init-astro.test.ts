import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { initAstro } from "../src/init-astro";

describe("initAstro", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "init-astro-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should scaffold template into target directory", () => {
    const target = path.join(tmpDir, "story-docs");
    initAstro({ targetDir: target });

    expect(fs.existsSync(path.join(target, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(target, "astro.config.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(target, "tsconfig.json"))).toBe(true);
    expect(fs.existsSync(path.join(target, "src/content/docs/index.md"))).toBe(true);
    expect(fs.existsSync(path.join(target, "src/content/docs/stories/.gitkeep"))).toBe(true);
    expect(fs.existsSync(path.join(target, "public/stories/assets/.gitkeep"))).toBe(true);
  });

  it("should refuse to overwrite existing non-empty directory without force", () => {
    const target = path.join(tmpDir, "story-docs");
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, "file.txt"), "existing");

    expect(() => initAstro({ targetDir: target })).toThrow(/already exists/);
  });

  it("should overwrite existing directory with force flag", () => {
    const target = path.join(tmpDir, "story-docs");
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, "file.txt"), "existing");

    initAstro({ targetDir: target, force: true });
    expect(fs.existsSync(path.join(target, "package.json"))).toBe(true);
  });

  it("should return the target directory path", () => {
    const target = path.join(tmpDir, "story-docs");
    const result = initAstro({ targetDir: target });
    expect(result.targetDir).toBe(target);
  });
});
