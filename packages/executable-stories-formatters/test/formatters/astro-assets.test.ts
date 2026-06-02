import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  scanMarkdownAssets,
  rewriteAssetPaths,
  copyMarkdownAssets,
} from "../../src/formatters/astro-assets";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "astro-assets-test-"));
}

function writeFile(dir: string, name: string, content = "stub"): string {
  const filePath = path.join(dir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

// ---------------------------------------------------------------------------
// scanMarkdownAssets
// ---------------------------------------------------------------------------

describe("scanMarkdownAssets", () => {
  it("finds markdown image references", () => {
    const md = "![screenshot](./images/screen.png) text ![logo](logo.svg)";
    const refs = scanMarkdownAssets(md);
    expect(refs).toContain("./images/screen.png");
    expect(refs).toContain("logo.svg");
  });

  it("finds HTML img src attributes", () => {
    const md = `<img src="./photo.jpg" alt="photo">`;
    const refs = scanMarkdownAssets(md);
    expect(refs).toContain("./photo.jpg");
  });

  it("finds HTML source src attributes (video)", () => {
    const md = `<video controls><source src="./clip.webm" type="video/webm"></video>`;
    const refs = scanMarkdownAssets(md);
    expect(refs).toContain("./clip.webm");
  });

  it("finds HTML video src attributes", () => {
    const md = `<video src="./demo.mp4"></video>`;
    const refs = scanMarkdownAssets(md);
    expect(refs).toContain("./demo.mp4");
  });

  it("finds video poster frames", () => {
    const md = `<video controls poster="./poster.png"><source src="./clip.webm" /></video>`;
    const refs = scanMarkdownAssets(md);
    expect(refs).toContain("./poster.png");
    expect(refs).toContain("./clip.webm");
  });

  it("does NOT include http URLs", () => {
    const md = "![remote](http://example.com/image.png)";
    expect(scanMarkdownAssets(md)).toHaveLength(0);
  });

  it("does NOT include https URLs", () => {
    const md = "![secure](https://cdn.example.com/image.png)";
    expect(scanMarkdownAssets(md)).toHaveLength(0);
  });

  it("does NOT include data: URIs", () => {
    const md = `<img src="data:image/png;base64,abc123">`;
    expect(scanMarkdownAssets(md)).toHaveLength(0);
  });

  it("does NOT include anchor-only refs (#)", () => {
    const md = "![ref](#section)";
    expect(scanMarkdownAssets(md)).toHaveLength(0);
  });

  it("deduplicates repeated references", () => {
    const md = "![a](./img.png) and ![b](./img.png)";
    const refs = scanMarkdownAssets(md);
    expect(refs.filter((r) => r === "./img.png")).toHaveLength(1);
  });

  it("returns empty array for markdown with no assets", () => {
    expect(scanMarkdownAssets("# Hello world\n\nJust text.")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// rewriteAssetPaths
// ---------------------------------------------------------------------------

describe("rewriteAssetPaths", () => {
  it("rewrites local markdown image paths using pathMap", () => {
    const md = "![shot](./screen.png)";
    const pathMap = new Map([["./screen.png", "screen-abc123.png"]]);
    const result = rewriteAssetPaths(md, "/assets", pathMap);
    expect(result).toBe("![shot](/assets/screen-abc123.png)");
  });

  it("rewrites local HTML img src using pathMap", () => {
    const md = `<img src="./photo.jpg" alt="photo">`;
    const pathMap = new Map([["./photo.jpg", "photo-deadbeef.jpg"]]);
    const result = rewriteAssetPaths(md, "/assets", pathMap);
    expect(result).toContain(`src="/assets/photo-deadbeef.jpg"`);
  });

  it("rewrites HTML source src (video tag)", () => {
    const md = `<source src="./clip.webm" type="video/webm">`;
    const pathMap = new Map([["./clip.webm", "clip-cafebabe.webm"]]);
    const result = rewriteAssetPaths(md, "/assets", pathMap);
    expect(result).toContain(`src="/assets/clip-cafebabe.webm"`);
  });

  it("does NOT rewrite http URLs", () => {
    const md = "![remote](http://example.com/image.png)";
    const result = rewriteAssetPaths(md, "/assets", new Map());
    expect(result).toBe(md);
  });

  it("does NOT rewrite https URLs", () => {
    const md = `<img src="https://cdn.example.com/image.png">`;
    const result = rewriteAssetPaths(md, "/assets", new Map());
    expect(result).toBe(md);
  });

  it("does NOT rewrite data: URIs", () => {
    const md = `<img src="data:image/png;base64,abc">`;
    const result = rewriteAssetPaths(md, "/assets", new Map());
    expect(result).toBe(md);
  });

  it("leaves path unchanged when not in pathMap", () => {
    const md = "![shot](./missing.png)";
    const pathMap = new Map<string, string>();
    const result = rewriteAssetPaths(md, "/assets", pathMap);
    expect(result).toBe(md);
  });

  it("rewrites with trailing-slash-free base URL", () => {
    const md = "![logo](logo.svg)";
    const pathMap = new Map([["logo.svg", "logo-1a2b3c4d.svg"]]);
    const result = rewriteAssetPaths(md, "/_astro", pathMap);
    expect(result).toBe("![logo](/_astro/logo-1a2b3c4d.svg)");
  });
});

// ---------------------------------------------------------------------------
// copyMarkdownAssets
// ---------------------------------------------------------------------------

describe("copyMarkdownAssets", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("copies referenced image files and rewrites paths", () => {
    writeFile(tmpDir, "screenshot.png", "PNG_DATA");
    const md = "Here is a screenshot: ![shot](./screenshot.png)";
    const assetsDir = path.join(tmpDir, "assets");

    const result = copyMarkdownAssets({
      markdown: md,
      markdownDir: tmpDir,
      assetsDir,
      assetsBaseUrl: "/public/assets",
    });

    expect(result.copiedCount).toBe(1);
    expect(result.missingCount).toBe(0);
    expect(result.missing).toHaveLength(0);
    // The rewritten markdown should contain the base URL
    expect(result.markdown).toContain("/public/assets/");
    // The original path should be gone
    expect(result.markdown).not.toContain("./screenshot.png");
    // The file should exist in assetsDir
    const files = fs.readdirSync(assetsDir);
    expect(files.some((f) => f.startsWith("screenshot-") && f.endsWith(".png"))).toBe(true);
  });

  it("handles missing files gracefully with allowMissing=true", () => {
    const md = "![missing](./no-such-file.png)";
    const assetsDir = path.join(tmpDir, "assets");

    const result = copyMarkdownAssets({
      markdown: md,
      markdownDir: tmpDir,
      assetsDir,
      assetsBaseUrl: "/assets",
      allowMissing: true,
    });

    expect(result.missingCount).toBe(1);
    expect(result.missing).toContain("./no-such-file.png");
    expect(result.copiedCount).toBe(0);
    // Path remains unchanged since it wasn't copied
    expect(result.markdown).toContain("./no-such-file.png");
  });

  it("does not copy root-relative markdown asset refs", () => {
    const md = "![logo](/images/logo.svg)";
    const assetsDir = path.join(tmpDir, "assets");

    const result = copyMarkdownAssets({
      markdown: md,
      markdownDir: tmpDir,
      assetsDir,
      assetsBaseUrl: "/assets",
    });

    expect(result.copiedCount).toBe(0);
    expect(result.missingCount).toBe(0);
    expect(result.markdown).toBe(md);
    expect(fs.existsSync(assetsDir)).toBe(false);
  });

  it("throws on missing files with allowMissing=false (default)", () => {
    const md = "![missing](./no-such-file.png)";
    const assetsDir = path.join(tmpDir, "assets");

    expect(() =>
      copyMarkdownAssets({
        markdown: md,
        markdownDir: tmpDir,
        assetsDir,
        assetsBaseUrl: "/assets",
      }),
    ).toThrow(/Asset not found/);
  });

  it("copies multiple assets and rewrites all paths", () => {
    writeFile(tmpDir, "a.png", "AAAA");
    writeFile(tmpDir, "b.webm", "BBBB");
    const md = "![a](./a.png)\n<source src=\"./b.webm\" type=\"video/webm\">";
    const assetsDir = path.join(tmpDir, "assets");

    const result = copyMarkdownAssets({
      markdown: md,
      markdownDir: tmpDir,
      assetsDir,
      assetsBaseUrl: "/assets",
    });

    expect(result.copiedCount).toBe(2);
    expect(result.markdown).not.toContain("./a.png");
    expect(result.markdown).not.toContain("./b.webm");
    expect(result.markdown).toContain("/assets/");
  });

  it("handles markdown image titles without treating the title as part of the path", () => {
    writeFile(tmpDir, "logo.svg", "SVG");
    const assetsDir = path.join(tmpDir, "assets");

    expect(() =>
      copyMarkdownAssets({
        markdown: '![logo](./logo.svg "Logo")',
        markdownDir: tmpDir,
        assetsDir,
        assetsBaseUrl: "/assets",
      }),
    ).not.toThrow();
  });

  it("ignores image syntax inside fenced code blocks", () => {
    const assetsDir = path.join(tmpDir, "assets");
    const md = [
      "```md",
      "![logo](./logo.svg)",
      "```",
    ].join("\n");

    expect(() =>
      copyMarkdownAssets({
        markdown: md,
        markdownDir: tmpDir,
        assetsDir,
        assetsBaseUrl: "/assets",
      }),
    ).not.toThrow();
    expect(fs.existsSync(assetsDir)).toBe(false);
  });

  it("keeps fenced code block examples unchanged when the same asset is copied elsewhere", () => {
    writeFile(tmpDir, "logo.svg", "SVG");
    const assetsDir = path.join(tmpDir, "assets");
    const md = [
      "Here is the real image: ![logo](./logo.svg)",
      "",
      "```md",
      "Example syntax: ![logo](./logo.svg)",
      "```",
    ].join("\n");

    const result = copyMarkdownAssets({
      markdown: md,
      markdownDir: tmpDir,
      assetsDir,
      assetsBaseUrl: "/assets",
    });

    expect(result.markdown).toContain("Here is the real image: ![logo](/assets/");
    expect(result.markdown).toContain("Example syntax: ![logo](./logo.svg)");
  });

  it("ignores image syntax inside inline code spans", () => {
    const assetsDir = path.join(tmpDir, "assets");
    const md = "Inline example: `![logo](./logo.svg)`";

    expect(() =>
      copyMarkdownAssets({
        markdown: md,
        markdownDir: tmpDir,
        assetsDir,
        assetsBaseUrl: "/assets",
      }),
    ).not.toThrow();
    expect(fs.existsSync(assetsDir)).toBe(false);
  });

  it("ignores image syntax inside long-delimited inline code spans", () => {
    const assetsDir = path.join(tmpDir, "assets");
    const md = "Inline example: ````![logo](./logo.svg)````";

    expect(() =>
      copyMarkdownAssets({
        markdown: md,
        markdownDir: tmpDir,
        assetsDir,
        assetsBaseUrl: "/assets",
      }),
    ).not.toThrow();
    expect(fs.existsSync(assetsDir)).toBe(false);
  });

  it("ignores image syntax inside indented fenced code blocks", () => {
    const assetsDir = path.join(tmpDir, "assets");
    const md = [
      "- Example:",
      "  ```md",
      "  ![logo](./logo.svg)",
      "  ```",
    ].join("\n");

    expect(() =>
      copyMarkdownAssets({
        markdown: md,
        markdownDir: tmpDir,
        assetsDir,
        assetsBaseUrl: "/assets",
      }),
    ).not.toThrow();
    expect(fs.existsSync(assetsDir)).toBe(false);
  });

  it("ignores image syntax inside HTML code blocks", () => {
    const assetsDir = path.join(tmpDir, "assets");
    const md = "<pre><code>![logo](./logo.svg)</code></pre>";

    expect(() =>
      copyMarkdownAssets({
        markdown: md,
        markdownDir: tmpDir,
        assetsDir,
        assetsBaseUrl: "/assets",
      }),
    ).not.toThrow();
    expect(fs.existsSync(assetsDir)).toBe(false);
  });

  it("keeps indented fenced code block examples unchanged when the same asset is copied elsewhere", () => {
    writeFile(tmpDir, "logo.svg", "SVG");
    const assetsDir = path.join(tmpDir, "assets");
    const md = [
      "Here is the real image: ![logo](./logo.svg)",
      "",
      "- Example:",
      "  ```md",
      "  Example syntax: ![logo](./logo.svg)",
      "  ```",
    ].join("\n");

    const result = copyMarkdownAssets({
      markdown: md,
      markdownDir: tmpDir,
      assetsDir,
      assetsBaseUrl: "/assets",
    });

    expect(result.markdown).toContain("Here is the real image: ![logo](/assets/");
    expect(result.markdown).toContain("Example syntax: ![logo](./logo.svg)");
  });

  it("keeps inline code examples unchanged when the same asset is copied elsewhere", () => {
    writeFile(tmpDir, "logo.svg", "SVG");
    const assetsDir = path.join(tmpDir, "assets");
    const md = [
      "Here is the real image: ![logo](./logo.svg)",
      "",
      "Inline example: `![logo](./logo.svg)`",
    ].join("\n");

    const result = copyMarkdownAssets({
      markdown: md,
      markdownDir: tmpDir,
      assetsDir,
      assetsBaseUrl: "/assets",
    });

    expect(result.markdown).toContain("Here is the real image: ![logo](/assets/");
    expect(result.markdown).toContain("Inline example: `![logo](./logo.svg)`");
  });

  it("is idempotent: copying same file twice only results in one file", () => {
    writeFile(tmpDir, "logo.svg", "SVG");
    const md = "![logo](./logo.svg) and ![logo2](./logo.svg)";
    const assetsDir = path.join(tmpDir, "assets");

    copyMarkdownAssets({
      markdown: md,
      markdownDir: tmpDir,
      assetsDir,
      assetsBaseUrl: "/assets",
    });

    const files = fs.readdirSync(assetsDir);
    const logoFiles = files.filter((f) => f.startsWith("logo-"));
    expect(logoFiles).toHaveLength(1);
  });

  it("creates assetsDir if it does not exist", () => {
    writeFile(tmpDir, "img.png", "IMG");
    const assetsDir = path.join(tmpDir, "deep", "assets");
    // assetsDir should not exist yet
    expect(fs.existsSync(assetsDir)).toBe(false);

    copyMarkdownAssets({
      markdown: "![img](./img.png)",
      markdownDir: tmpDir,
      assetsDir,
      assetsBaseUrl: "/assets",
    });

    expect(fs.existsSync(assetsDir)).toBe(true);
  });
});
