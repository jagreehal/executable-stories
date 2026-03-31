import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

/**
 * Copy a source file into assetsDir with a content-hashed filename.
 *
 * Returns the relative path from the HTML file's directory to the copied asset
 * (e.g. "assets/video-3f2c1a7b.webm").
 *
 * Idempotent: if the destination already exists, skips the copy.
 */
export function copyAsset(sourcePath: string, assetsDir: string): string {
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const content = fs.readFileSync(sourcePath);
  const hash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 8);

  const ext = path.extname(sourcePath);
  const baseName = sanitize(path.basename(sourcePath, ext));
  const destName = `${baseName}-${hash}${ext}`;
  const destPath = path.join(assetsDir, destName);

  if (!fs.existsSync(destPath)) {
    fs.copyFileSync(sourcePath, destPath);
  }

  return `assets/${destName}`;
}

/** Replace non-alphanumeric/hyphen/dot characters with hyphens, collapse runs. */
function sanitize(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}
