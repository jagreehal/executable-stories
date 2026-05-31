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
    expect(fs.existsSync(path.join(target, "public/stories/story-report.json"))).toBe(true);
    expect(fs.existsSync(path.join(target, "src/pages/stories/index.astro"))).toBe(true);
  });

  it("should include the static scenario explorer page", () => {
    const target = path.join(tmpDir, "story-docs");
    initAstro({ targetDir: target });

    const explorer = fs.readFileSync(path.join(target, "src/pages/stories/index.astro"), "utf8");
    expect(explorer).toContain("Scenario Explorer");
    expect(explorer).toContain("/stories/story-report.json");
    expect(explorer).toContain("Search scenarios");
    expect(explorer).toContain("status-filter");
    expect(explorer).toContain("history.replaceState");
    expect(explorer).toContain("source-link");
  });

  it("should include theme CSS files", () => {
    const target = path.join(tmpDir, "story-docs");
    initAstro({ targetDir: target });

    expect(fs.existsSync(path.join(target, "src/styles/global.css"))).toBe(true);
    expect(fs.existsSync(path.join(target, "src/styles/themes/default.css"))).toBe(true);
    expect(fs.existsSync(path.join(target, "src/styles/themes/corporate.css"))).toBe(true);
    expect(fs.existsSync(path.join(target, "src/styles/themes/terminal.css"))).toBe(true);
    expect(fs.existsSync(path.join(target, "src/styles/themes/minimal.css"))).toBe(true);
    expect(fs.existsSync(path.join(target, "src/styles/themes/dashboard.css"))).toBe(true);
    expect(fs.existsSync(path.join(target, "src/styles/themes/playful.css"))).toBe(true);
  });

  it("should include tsconfig with types and rootDir", () => {
    const target = path.join(tmpDir, "story-docs");
    initAstro({ targetDir: target });

    const tsconfig = JSON.parse(fs.readFileSync(path.join(target, "tsconfig.json"), "utf8"));
    expect(tsconfig.compilerOptions.types).toContain("node");
    expect(tsconfig.compilerOptions.rootDir).toBe("./src");
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
