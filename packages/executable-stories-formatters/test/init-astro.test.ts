import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { initAstro } from "../src/init-astro";

describe("initAstro (thin Starlight scaffold)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "init-astro-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("scaffolds the thin set of user-owned files", () => {
    const target = path.join(tmpDir, "story-docs");
    initAstro({ targetDir: target });

    for (const f of [
      "package.json",
      "astro.config.mjs",
      "executable-stories.config.mjs",
      ".gitignore",
      "tsconfig.json",
      "src/content.config.ts",
      "src/content/docs/index.mdx",
      "src/styles/stories.css",
    ]) {
      expect(fs.existsSync(path.join(target, f)), f).toBe(true);
    }
  });

  it("wires the executable-stories integration and the stories collection from one config", () => {
    const target = path.join(tmpDir, "story-docs");
    initAstro({ targetDir: target });

    // One shared config object drives both halves.
    const esConfig = fs.readFileSync(path.join(target, "executable-stories.config.mjs"), "utf8");
    expect(esConfig).toContain("defineExecutableStories");
    expect(esConfig).toContain("groupBy");

    const config = fs.readFileSync(path.join(target, "astro.config.mjs"), "utf8");
    expect(config).toContain("executableStories");
    expect(config).toContain("@astrojs/starlight");
    // Nav is built from the config via the sidebar helper.
    expect(config).toContain("storiesSidebar");
    expect(config).toContain("./executable-stories.config.mjs");

    const content = fs.readFileSync(path.join(target, "src/content.config.ts"), "utf8");
    expect(content).toContain("storiesLoader");
    expect(content).toContain("stories:");
    // Authored docs collection stays alongside the generated stories.
    expect(content).toContain("docsLoader");
  });

  it("does NOT copy framework files — those ship in executable-stories-astro", () => {
    const target = path.join(tmpDir, "story-docs");
    initAstro({ targetDir: target });

    // The loader, story route, and render-doc-entry live in the package now.
    expect(fs.existsSync(path.join(target, "src/lib/render-doc-entry.ts"))).toBe(false);
    expect(fs.existsSync(path.join(target, "src/pages/explorer/index.astro"))).toBe(false);
    expect(fs.existsSync(path.join(target, "src/components"))).toBe(false);

    const pkg = JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf8"));
    expect(pkg.dependencies["executable-stories-astro"]).toBeDefined();
    expect(pkg.dependencies["@astrojs/starlight"]).toBeDefined();
  });

  it("update mode preserves content + config and merges any new template deps", () => {
    const target = path.join(tmpDir, "story-docs");
    initAstro({ targetDir: target });

    const adrPath = path.join(target, "src/content/docs/adr/0001-mine.mdx");
    fs.mkdirSync(path.dirname(adrPath), { recursive: true });
    fs.writeFileSync(adrPath, "my hand-written ADR");
    const astroConfig = path.join(target, "astro.config.mjs");
    fs.writeFileSync(astroConfig, "// my customized sidebar/theme");
    const pkgPath = path.join(target, "package.json");
    const userPkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    userPkg.dependencies = { ...userPkg.dependencies, "my-custom-dep": "^1.0.0" };
    delete userPkg.dependencies["@astrojs/starlight"]; // pretend a template dep is missing
    fs.writeFileSync(pkgPath, JSON.stringify(userPkg, null, 2));

    initAstro({ targetDir: target, update: true });

    // Content + config left exactly as the user wrote them (the package owns the framework).
    expect(fs.readFileSync(adrPath, "utf8")).toBe("my hand-written ADR");
    expect(fs.readFileSync(astroConfig, "utf8")).toBe("// my customized sidebar/theme");

    // User deps preserved; the missing template dep was merged back in.
    const merged = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    expect(merged.dependencies["my-custom-dep"]).toBe("^1.0.0");
    expect(merged.dependencies["@astrojs/starlight"]).toBeDefined();
  });

  it("update mode refuses a directory that was never scaffolded", () => {
    const target = path.join(tmpDir, "not-a-site");
    fs.mkdirSync(target);
    expect(() => initAstro({ targetDir: target, update: true })).toThrow(/scaffolded docs site/);
  });

  it("refuses to overwrite a non-empty directory without force", () => {
    const target = path.join(tmpDir, "story-docs");
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, "file.txt"), "existing");
    expect(() => initAstro({ targetDir: target })).toThrow(/already exists/);
  });

  it("overwrites with the force flag", () => {
    const target = path.join(tmpDir, "story-docs");
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, "file.txt"), "existing");
    initAstro({ targetDir: target, force: true });
    expect(fs.existsSync(path.join(target, "package.json"))).toBe(true);
  });

  it("returns the target directory path", () => {
    const target = path.join(tmpDir, "story-docs");
    const result = initAstro({ targetDir: target });
    expect(result.targetDir).toBe(target);
  });
});
