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
    expect(fs.existsSync(path.join(target, "src/content/docs/index.mdx"))).toBe(true);
    expect(fs.existsSync(path.join(target, "src/components/VerifiedBy.astro"))).toBe(true);
    expect(fs.existsSync(path.join(target, "src/components/ApiOperations.astro"))).toBe(true);
    expect(fs.existsSync(path.join(target, "src/lib/verification.ts"))).toBe(true);
    expect(fs.existsSync(path.join(target, "src/lib/config.ts"))).toBe(true);
    expect(fs.existsSync(path.join(target, "src/content/docs/stories/.gitkeep"))).toBe(true);
    expect(fs.existsSync(path.join(target, "public/stories/assets/.gitkeep"))).toBe(true);
    expect(fs.existsSync(path.join(target, "public/stories/story-report.json"))).toBe(true);
    expect(fs.existsSync(path.join(target, "src/pages/explorer/index.astro"))).toBe(true);
  });

  it("should include the static scenario explorer page", () => {
    const target = path.join(tmpDir, "story-docs");
    initAstro({ targetDir: target });

    const explorer = fs.readFileSync(path.join(target, "src/pages/explorer/index.astro"), "utf8");
    expect(explorer).toContain("Scenario Explorer");
    // The report URL now comes from the central config, not a hardcoded literal.
    expect(explorer).toContain("REPORT_URL");
    expect(explorer).toContain("Search scenarios");
    expect(explorer).toContain("status-filter");
    expect(explorer).toContain("history.replaceState");
    expect(explorer).toContain("source-link");
  });

  it("routes the report location through a single config module", () => {
    const target = path.join(tmpDir, "story-docs");
    initAstro({ targetDir: target });

    const config = fs.readFileSync(path.join(target, "src/lib/config.ts"), "utf8");
    expect(config).toContain("public/stories/story-report.json");
    expect(config).toContain("REPORT_URL");

    // The badge/dashboard/checklist components read the report via config,
    // not by importing the JSON path directly.
    for (const file of ["VerifiedBy.astro", "HealthDashboard.astro", "VerifiedStep.astro"]) {
      const src = fs.readFileSync(path.join(target, "src/components", file), "utf8");
      expect(src).toContain('from "../lib/config"');
      expect(src).not.toContain("public/stories/story-report.json");
    }
  });

  it("links verifying stories and API endpoints into the explorer", () => {
    const target = path.join(tmpDir, "story-docs");
    initAstro({ targetDir: target });

    // The shared deep-link helper lives in config and is used by the badge.
    const config = fs.readFileSync(path.join(target, "src/lib/config.ts"), "utf8");
    expect(config).toContain("explorerUrl");
    expect(config).toContain("SOURCE_BASE_URL");

    const badge = fs.readFileSync(path.join(target, "src/components/VerifiedBy.astro"), "utf8");
    expect(badge).toContain("explorerUrl");

    const api = fs.readFileSync(path.join(target, "src/components/ApiOperations.astro"), "utf8");
    expect(api).toContain("explorerUrl");

    // The @components alias keeps generated MDX imports depth-independent.
    const tsconfig = JSON.parse(fs.readFileSync(path.join(target, "tsconfig.json"), "utf8"));
    expect(tsconfig.compilerOptions.paths["@components/*"]).toEqual(["src/components/*"]);
  });

  it("scaffolds the explorer's styles and doc renderer as separate files", () => {
    const target = path.join(tmpDir, "story-docs");
    initAstro({ targetDir: target });

    // CSS and the doc renderer are split out so the page stays a thin shell.
    expect(fs.existsSync(path.join(target, "src/pages/explorer/explorer.css"))).toBe(true);
    expect(fs.existsSync(path.join(target, "src/lib/render-doc-entry.ts"))).toBe(true);

    const explorer = fs.readFileSync(path.join(target, "src/pages/explorer/index.astro"), "utf8");
    expect(explorer).toContain('import "./explorer.css"');
    expect(explorer).toContain("render-doc-entry");

    // The renderer covers every doc kind, including first-class video.
    const renderer = fs.readFileSync(path.join(target, "src/lib/render-doc-entry.ts"), "utf8");
    for (const kind of ["video", "screenshot", "mermaid", "kv", "table", "section", "custom"]) {
      expect(renderer).toContain(`${kind}:`);
    }
    // Tags render as header pills, never as a doc entry.
    expect(renderer).toContain("tag: () =>");
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

  it("update mode refreshes framework files but never touches content or config", () => {
    const target = path.join(tmpDir, "story-docs");
    initAstro({ targetDir: target });

    // Simulate a user who has written content + customized config/deps, and
    // whose framework files are stale.
    const adrPath = path.join(target, "src/content/docs/adr/0001-mine.mdx");
    fs.mkdirSync(path.dirname(adrPath), { recursive: true });
    fs.writeFileSync(adrPath, "my hand-written ADR");
    const explorerPath = path.join(target, "src/pages/explorer/index.astro");
    fs.writeFileSync(explorerPath, "STALE EXPLORER");
    const astroConfig = path.join(target, "astro.config.mjs");
    fs.writeFileSync(astroConfig, "// my customized sidebar/theme");
    const pkgPath = path.join(target, "package.json");
    const userPkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    userPkg.dependencies = { ...userPkg.dependencies, "my-custom-dep": "^1.0.0" };
    fs.writeFileSync(pkgPath, JSON.stringify(userPkg, null, 2));

    const result = initAstro({ targetDir: target, update: true });

    // Framework files refreshed from the template.
    expect(fs.readFileSync(explorerPath, "utf8")).toContain("Scenario Explorer");
    expect(result.updatedFiles?.some((f) => f.includes("explorer"))).toBe(true);

    // Content + config left exactly as the user wrote them.
    expect(fs.readFileSync(adrPath, "utf8")).toBe("my hand-written ADR");
    expect(fs.readFileSync(astroConfig, "utf8")).toBe("// my customized sidebar/theme");

    // User deps preserved; new framework deps (marked, highlight.js) merged in.
    const merged = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    expect(merged.dependencies["my-custom-dep"]).toBe("^1.0.0");
    expect(merged.dependencies["marked"]).toBeDefined();
    expect(merged.dependencies["highlight.js"]).toBeDefined();
  });

  it("update mode refuses a directory that was never scaffolded", () => {
    const target = path.join(tmpDir, "not-a-site");
    fs.mkdirSync(target);
    expect(() => initAstro({ targetDir: target, update: true })).toThrow(/scaffolded docs site/);
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
