import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { bundleAssets } from "../../src/bundler/bundle-assets";

describe("bundleAssets", () => {
  let tmpDir: string;
  let reportsDir: string;
  let testResultsDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "es-bundle-"));
    reportsDir = path.join(tmpDir, "reports");
    testResultsDir = path.join(tmpDir, "test-results", "login-flow");
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.mkdirSync(testResultsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("copies referenced video and rewrites path in HTML", () => {
    const videoPath = path.join(testResultsDir, "video.webm");
    fs.writeFileSync(videoPath, "fake video");

    const relVideoPath = path.relative(reportsDir, videoPath);
    const html = `<html><body><video class="attachment-video" controls src="${relVideoPath}"></video></body></html>`;
    const htmlPath = path.join(reportsDir, "index.html");
    fs.writeFileSync(htmlPath, html);

    const result = bundleAssets(htmlPath);

    expect(result.copiedCount).toBe(1);
    expect(result.missingCount).toBe(0);

    const updatedHtml = fs.readFileSync(htmlPath, "utf8");
    expect(updatedHtml).not.toContain(relVideoPath);
    expect(updatedHtml).toMatch(/src="assets\/video-[a-f0-9]{8}\.webm"/);

    const assetsDir = path.join(reportsDir, "assets");
    expect(fs.existsSync(assetsDir)).toBe(true);
    const assetFiles = fs.readdirSync(assetsDir);
    expect(assetFiles).toHaveLength(1);
    expect(assetFiles[0]).toMatch(/^video-[a-f0-9]{8}\.webm$/);
  });

  it("copies referenced screenshot and rewrites path", () => {
    const screenshotPath = path.join(tmpDir, "screenshots", "step-1.png");
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    fs.writeFileSync(screenshotPath, "fake png");

    const relPath = path.relative(reportsDir, screenshotPath);
    const html = `<img src="${relPath}" alt="Step 1" class="doc-screenshot-img" />`;
    const htmlPath = path.join(reportsDir, "index.html");
    fs.writeFileSync(htmlPath, html);

    const result = bundleAssets(htmlPath);

    expect(result.copiedCount).toBe(1);
    const updatedHtml = fs.readFileSync(htmlPath, "utf8");
    expect(updatedHtml).toMatch(/src="assets\/step-1-[a-f0-9]{8}\.png"/);
  });

  it("skips data: URIs and https: URLs without error", () => {
    const html = `
      <img src="data:image/png;base64,abc123" />
      <img src="https://example.com/image.png" />
    `;
    const htmlPath = path.join(reportsDir, "index.html");
    fs.writeFileSync(htmlPath, html);

    const result = bundleAssets(htmlPath);
    expect(result.copiedCount).toBe(0);
    expect(result.missingCount).toBe(0);

    const updatedHtml = fs.readFileSync(htmlPath, "utf8");
    expect(updatedHtml).toContain("data:image/png;base64,abc123");
    expect(updatedHtml).toContain("https://example.com/image.png");
  });

  it("fails by default when a referenced asset is missing", () => {
    const html = `<video src="../test-results/gone/video.webm"></video>`;
    const htmlPath = path.join(reportsDir, "index.html");
    fs.writeFileSync(htmlPath, html);

    expect(() => bundleAssets(htmlPath)).toThrow(/Missing asset/);
  });

  it("warns but continues with allowMissing: true", () => {
    const html = `<video src="../test-results/gone/video.webm"></video>`;
    const htmlPath = path.join(reportsDir, "index.html");
    fs.writeFileSync(htmlPath, html);

    const result = bundleAssets(htmlPath, { allowMissing: true });
    expect(result.missingCount).toBe(1);
    expect(result.missing).toEqual(["../test-results/gone/video.webm"]);
  });

  it("does not treat ordinary local hyperlinks as bundleable assets", () => {
    const html = `
      <div class="doc-link">
        <a href="../docs/runbook.md" target="_blank" rel="noopener noreferrer">Runbook</a>
      </div>
    `;
    const htmlPath = path.join(reportsDir, "index.html");
    fs.writeFileSync(htmlPath, html);

    const result = bundleAssets(htmlPath);

    expect(result.copiedCount).toBe(0);
    expect(result.missingCount).toBe(0);

    const updatedHtml = fs.readFileSync(htmlPath, "utf8");
    expect(updatedHtml).toContain('href="../docs/runbook.md"');
    expect(updatedHtml).not.toContain('href="assets/');
  });

  it("rewrites only bundleable elements when a doc link shares the same path", () => {
    const tracePath = path.join(tmpDir, "test-results", "trace.zip");
    fs.mkdirSync(path.dirname(tracePath), { recursive: true });
    fs.writeFileSync(tracePath, "fake trace");

    const relPath = path.relative(reportsDir, tracePath);
    const html = `
      <a class="attachment" href="${relPath}">Trace attachment</a>
      <div class="doc-link">
        <a href="${relPath}" target="_blank" rel="noopener noreferrer">Trace docs</a>
      </div>
    `;
    const htmlPath = path.join(reportsDir, "index.html");
    fs.writeFileSync(htmlPath, html);

    const result = bundleAssets(htmlPath);

    expect(result.copiedCount).toBe(1);

    const updatedHtml = fs.readFileSync(htmlPath, "utf8");
    expect(updatedHtml).toMatch(/<a class="attachment" href="assets\/trace-[a-f0-9]{8}\.zip">/);
    expect(updatedHtml).toContain(`<a href="${relPath}" target="_blank" rel="noopener noreferrer">Trace docs</a>`);
  });

  it("handles multiple assets in one HTML file", () => {
    const video1 = path.join(tmpDir, "test-results", "t1", "video.webm");
    const video2 = path.join(tmpDir, "test-results", "t2", "video.webm");
    fs.mkdirSync(path.dirname(video1), { recursive: true });
    fs.mkdirSync(path.dirname(video2), { recursive: true });
    fs.writeFileSync(video1, "video content 1");
    fs.writeFileSync(video2, "video content 2");

    const rel1 = path.relative(reportsDir, video1);
    const rel2 = path.relative(reportsDir, video2);
    const html = `
      <video src="${rel1}"></video>
      <video src="${rel2}"></video>
    `;
    const htmlPath = path.join(reportsDir, "index.html");
    fs.writeFileSync(htmlPath, html);

    const result = bundleAssets(htmlPath);
    expect(result.copiedCount).toBe(2);

    const assetsDir = path.join(reportsDir, "assets");
    expect(fs.readdirSync(assetsDir)).toHaveLength(2);
  });
});
