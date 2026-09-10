/**
 * Tests for scripts/collect-assets.mjs — which media in a report gets committed
 * to a public branch, and which does not.
 *
 * Run: node --test packages/executable-stories-action/test/collect-assets.test.mjs
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, "..", "scripts", "collect-assets.mjs");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-assets-"));

after(() => fs.rmSync(root, { recursive: true, force: true }));

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c636000000200010005fe02fa0000000049454e44ae426082",
  "hex"
);

/**
 * Lay out a workspace the way a run leaves one — a report directory with an
 * `assets/` beside it — then collect from it.
 */
function collect(markdown, files = {}, outside = {}) {
  const workspace = fs.mkdtempSync(path.join(root, "ws-"));
  const reportDir = path.join(workspace, "reports");
  fs.mkdirSync(reportDir, { recursive: true });

  for (const [rel, bytes] of Object.entries(files)) {
    const target = path.join(reportDir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
  // Files deliberately placed outside the workspace, to be reached only by traversal.
  for (const [rel, bytes] of Object.entries(outside)) {
    const target = path.join(root, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }

  const mdPath = path.join(reportDir, "test-results.md");
  fs.writeFileSync(mdPath, markdown);
  const manifestPath = path.join(workspace, "manifest.json");

  const stdout = execFileSync(process.execPath, [script], {
    env: {
      ...process.env,
      MD_PATH: mdPath,
      MANIFEST_OUT: manifestPath,
      GITHUB_WORKSPACE: workspace,
    },
    encoding: "utf8",
  });

  return { manifest: JSON.parse(fs.readFileSync(manifestPath, "utf8")), stdout, workspace };
}

describe("collect-assets", () => {
  it("collects a relative screenshot — the shape Playwright actually emits", () => {
    const { manifest } = collect("![Login page](../screenshots/login.png)\n", {
      "../screenshots/login.png": PNG,
    });

    assert.equal(manifest.length, 1);
    assert.equal(manifest[0].ref, "../screenshots/login.png");
    assert.equal(manifest[0].mime, "image/png");
    assert.match(manifest[0].filename, /^\d{3}-login-page\.png$/);
    assert.ok(manifest[0].path.endsWith(path.join("screenshots", "login.png")));
  });

  it("collects a bundled asset and a video source together", () => {
    const { manifest } = collect(
      '![Dashboard](assets/dashboard.png)\n\n<video controls>\n  <source src="assets/run.webm" />\n</video>\n',
      { "assets/dashboard.png": PNG, "assets/run.webm": Buffer.from("webm") }
    );

    const refs = manifest.map((a) => a.ref).sort();
    assert.deepEqual(refs, ["assets/dashboard.png", "assets/run.webm"]);
    assert.equal(manifest.find((a) => a.ref.endsWith(".webm")).mime, "video/webm");
  });

  it("inlines a data URI's bytes rather than a path", () => {
    const base64 = PNG.toString("base64");
    const { manifest } = collect(`![Cart](data:image/png;base64,${base64})\n`);

    assert.equal(manifest.length, 1);
    assert.equal(manifest[0].base64, base64);
    assert.equal(manifest[0].path, undefined);
    assert.match(manifest[0].filename, /-cart\.png$/);
  });

  it("refuses an inlined data URI that is not media", () => {
    // The allowlist has to cover both branches. Report content is
    // contributor-authored, and hosting publishes bytes to a branch anyone can
    // fetch — an inlined archive is no more publishable than a referenced one.
    const zip = Buffer.from("PK\u0003\u0004payload").toString("base64");
    const { manifest, stdout } = collect(`![x](data:application/zip;base64,${zip})\n`);

    assert.deepEqual(manifest, []);
    assert.match(stdout, /Refusing to host an inlined 'application\/zip'/);
  });

  it("refuses a reference that escapes the workspace", () => {
    // Report content is not trusted: on a fork PR the scenario titles and doc
    // paths in it are a contributor's code, and hosting is a publish. From
    // <workspace>/reports, "../../secret.png" lands outside the workspace.
    const { manifest, stdout } = collect("![Oops](../../secret.png)\n", {}, {
      "secret.png": PNG,
    });

    assert.deepEqual(manifest, []);
    assert.match(stdout, /Refusing to host '\.\.\/\.\.\/secret\.png'/);
    assert.match(stdout, /resolves outside the workspace/);
  });

  it("skips references it cannot fetch bytes for, and ones already fetchable", () => {
    const { manifest } = collect(
      [
        "![Missing](assets/gone.png)", // referenced, not on disk
        "![Hosted](https://example.com/x.png)", // already a URL
        "![Doc](../notes/readme.md)", // not media
        "[Not an image](assets/dashboard.png)", // a link, not an embed
      ].join("\n"),
      { "assets/dashboard.png": PNG }
    );

    assert.deepEqual(manifest, []);
  });

  it("skips a file too large to belong in a comment", () => {
    const { manifest, stdout } = collect("![Huge](assets/huge.png)\n", {
      "assets/huge.png": Buffer.alloc(11 * 1024 * 1024),
    });

    assert.deepEqual(manifest, []);
    assert.match(stdout, /exceeds the 10 MB hosting limit/);
  });

  it("deduplicates a screenshot referenced twice", () => {
    const { manifest } = collect(
      "![Dashboard](assets/dashboard.png)\n\n![Dashboard again](assets/dashboard.png)\n",
      { "assets/dashboard.png": PNG }
    );

    assert.equal(manifest.length, 1);
  });

  it("collects overlapping references without conflating them", () => {
    const { manifest } = collect("![A](assets/a.png)\n![B](a.png)\n", {
      "assets/a.png": PNG,
      "a.png": PNG,
    });

    assert.deepEqual(manifest.map((a) => a.ref).sort(), ["a.png", "assets/a.png"]);
    // Distinct blobs, so one cannot be mistaken for the other on the branch.
    assert.notEqual(manifest[0].filename, manifest[1].filename);
  });

  it("stops at the per-run file limit rather than exhausting the API budget", () => {
    const files = {};
    const lines = [];
    for (let i = 0; i < 60; i++) {
      files[`assets/shot-${i}.png`] = PNG;
      lines.push(`![Shot ${i}](assets/shot-${i}.png)`);
    }
    const { manifest, stdout } = collect(lines.join("\n") + "\n", files);

    assert.equal(manifest.length, 50);
    assert.match(stdout, /Hosting 50 asset\(s\) and skipping 10/);
    assert.match(stdout, /stay in the HTML report/);
  });

  it("stops at the per-run byte limit too", () => {
    const files = {};
    const lines = [];
    // Eight 9 MB files: under the 10 MB per-file cap, over the 50 MB run cap.
    for (let i = 0; i < 8; i++) {
      files[`assets/big-${i}.png`] = Buffer.alloc(9 * 1024 * 1024);
      lines.push(`![Big ${i}](assets/big-${i}.png)`);
    }
    const { manifest, stdout } = collect(lines.join("\n") + "\n", files);

    assert.equal(manifest.length, 5, "5 x 9 MB fits, the sixth would not");
    assert.match(stdout, /skipping 3/);
  });

  it("counts a data URI's decoded size against the run budget", () => {
    const big = Buffer.alloc(6 * 1024 * 1024).toString("base64");
    const markdown = Array.from(
      { length: 10 },
      (_, i) => `![Shot ${i}](data:image/png;base64,${big}${"A".repeat(i * 4)})`
    ).join("\n");
    const { manifest } = collect(markdown);

    assert.ok(manifest.length < 10, "the run budget applies to inlined bytes as well");
    assert.ok(manifest.length >= 8);
  });

  it("writes an empty manifest when the report is missing", () => {
    const workspace = fs.mkdtempSync(path.join(root, "ws-"));
    const manifestPath = path.join(workspace, "manifest.json");
    execFileSync(process.execPath, [script], {
      env: {
        ...process.env,
        MD_PATH: path.join(workspace, "nope.md"),
        MANIFEST_OUT: manifestPath,
        GITHUB_WORKSPACE: workspace,
      },
      encoding: "utf8",
    });
    assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath, "utf8")), []);
  });
});
