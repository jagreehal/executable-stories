/**
 * Find every screenshot and video the markdown report references, and write a
 * manifest of the ones worth hosting.
 *
 * A PR comment can only show media it can fetch over HTTPS. Three shapes reach
 * the markdown and only one of them worked before:
 *
 *   ![alt](data:image/png;base64,…)   inlined by the reporter — GitHub blocks
 *                                     `data:` in comments, so it must be hosted
 *   ![alt](assets/dashboard.png)      what Playwright and `--asset-mode copy`
 *                                     actually emit — a relative path that
 *                                     resolves to nothing in a comment
 *   <source src="assets/run.webm" />  same, and inside a tag GitHub deletes
 *
 * This step only decides *what* to upload. The commit lives in action.yml,
 * where the GitHub API client does, so everything here is a pure transform over
 * the filesystem and can be tested without a runner.
 *
 * Env in:
 *   MD_PATH             markdown report to scan
 *   MANIFEST_OUT        where to write the manifest JSON
 *   GITHUB_WORKSPACE    the boundary no referenced file may escape
 */

import fs from "node:fs";
import path from "node:path";

import { findReferences } from "./asset-refs.mjs";

const MD_PATH = process.env.MD_PATH;
const MANIFEST_OUT = process.env.MANIFEST_OUT;

/**
 * Per-file ceiling. The blob API takes base64, which inflates by a third, and a
 * PR comment is not the place for a 200 MB trace recording either way.
 */
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Ceilings on the run as a whole, which per-file limits do not give you.
 *
 * Every asset costs one `createBlob` call, and `GITHUB_TOKEN` gets roughly a
 * thousand API requests an hour per repository — a storyboard suite with three
 * hundred frames would spend the job's whole budget uploading screenshots and
 * then fail the calls that post the comment. The byte ceiling is the same
 * argument for commit size.
 *
 * Hitting either is a signal, not a failure: what fits is hosted, the rest is
 * named in a warning and stays in the HTML report.
 */
const MAX_ASSETS = 50;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

/** Only media. An arbitrary referenced file is not something to publish. */
const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
};

const EXT_BY_MIME = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "video/webm": "webm",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

function slugify(value, fallback) {
  const slug = (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

/**
 * Resolve a reference against the report, and refuse anything outside the
 * workspace.
 *
 * Report content is not trusted input. Scenario titles, doc paths and
 * attachment names come from the test run, and on a fork PR that is a
 * contributor's code. Without this check a crafted `![x](../../../etc/passwd)`
 * would have its bytes committed to a branch and published as a raw URL.
 */
function resolveInsideWorkspace(ref, reportDir, workspace) {
  let resolved;
  try {
    resolved = fs.realpathSync(path.resolve(reportDir, ref));
  } catch {
    return undefined; // missing, or a dangling symlink
  }

  let root;
  try {
    root = fs.realpathSync(workspace);
  } catch {
    return undefined;
  }

  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    console.log(
      `::warning::Refusing to host '${ref}' — it resolves outside the workspace.`
    );
    return undefined;
  }
  return resolved;
}

function main() {
  const manifest = [];
  let markdown;
  try {
    markdown = fs.readFileSync(MD_PATH, "utf8");
  } catch (e) {
    console.log(`::warning::Could not read markdown report at ${MD_PATH}: ${e.message}`);
    fs.writeFileSync(MANIFEST_OUT, "[]", "utf8");
    return;
  }

  const reportDir = path.dirname(path.resolve(MD_PATH));
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  let index = 0;
  let totalBytes = 0;
  let skippedForBudget = 0;

  for (const [ref, { alt }] of findReferences(markdown)) {
    index++;

    if (manifest.length >= MAX_ASSETS) {
      skippedForBudget++;
      continue;
    }

    const dataUri = /^data:([^;,]+);base64,(.+)$/s.exec(ref);
    if (dataUri) {
      const mime = dataUri[1];
      // Same allowlist as a file reference. An inlined `data:application/zip`
      // is still arbitrary contributor-authored bytes, and hosting publishes
      // them to a branch anyone can fetch.
      const ext = EXT_BY_MIME[mime];
      if (!ext) {
        console.log(`::warning::Refusing to host an inlined '${mime}' — only images and video are published.`);
        continue;
      }
      const bytes = Math.floor((dataUri[2].length * 3) / 4);
      if (bytes > MAX_BYTES || totalBytes + bytes > MAX_TOTAL_BYTES) {
        skippedForBudget++;
        continue;
      }
      totalBytes += bytes;
      manifest.push({
        ref,
        filename: `${String(index).padStart(3, "0")}-${slugify(alt, "screenshot")}.${ext}`,
        mime,
        base64: dataUri[2],
      });
      continue;
    }

    // Anything already fetchable, or a fragment, needs no help from us.
    if (/^(?:https?:|mailto:|#)/i.test(ref)) continue;

    const ext = path.extname(ref).toLowerCase();
    const mime = MIME_BY_EXT[ext];
    if (!mime) continue;

    const absolute = resolveInsideWorkspace(ref, reportDir, workspace);
    if (!absolute) continue;

    const stat = fs.statSync(absolute);
    if (!stat.isFile()) continue;
    if (stat.size > MAX_BYTES) {
      console.log(
        `::warning::Skipping '${ref}' — ${Math.round(stat.size / 1024 / 1024)} MB exceeds the ${MAX_BYTES / 1024 / 1024} MB hosting limit. It stays in the HTML report.`
      );
      continue;
    }

    if (totalBytes + stat.size > MAX_TOTAL_BYTES) {
      skippedForBudget++;
      continue;
    }
    totalBytes += stat.size;

    manifest.push({
      ref,
      filename: `${String(index).padStart(3, "0")}-${slugify(alt || path.basename(ref, ext), "asset")}${ext}`,
      mime,
      path: absolute,
    });
  }

  if (skippedForBudget > 0) {
    console.log(
      `::warning::Hosting ${manifest.length} asset(s) and skipping ${skippedForBudget} — the limit is ${MAX_ASSETS} files or ${MAX_TOTAL_BYTES / 1024 / 1024} MB per run, so a large media suite cannot exhaust the API budget the PR comment also needs. The rest stay in the HTML report.`
    );
  }

  fs.writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Found ${manifest.length} asset(s) to host from ${MD_PATH}`);
}

main();
