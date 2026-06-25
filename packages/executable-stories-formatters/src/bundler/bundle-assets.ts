import * as fs from "node:fs";
import * as path from "node:path";
import { scanHtmlAssets } from "./scan-html-assets";
import { copyAsset } from "./copy-asset";

export interface BundleOptions {
  /** If true, warn about missing assets instead of throwing. Default: false. */
  allowMissing?: boolean;
}

export interface BundleResult {
  /** Number of assets successfully copied */
  copiedCount: number;
  /** Number of missing assets */
  missingCount: number;
  /** Paths of missing assets (original references) */
  missing: string[];
}

/**
 * Post-process an HTML report file: copy referenced local assets into
 * an `assets/` directory beside it and rewrite paths in the HTML.
 */
export function bundleAssets(
  htmlPath: string,
  options: BundleOptions = {},
): BundleResult {
  const htmlDir = path.dirname(htmlPath);
  const assetsDir = path.join(htmlDir, "assets");

  let html = fs.readFileSync(htmlPath, "utf8");
  const refs = scanHtmlAssets(html);

  let copiedCount = 0;
  const missing: string[] = [];

  for (const ref of refs) {
    const absolutePath = path.resolve(htmlDir, ref);

    if (!fs.existsSync(absolutePath)) {
      missing.push(ref);
      continue;
    }

    const newRelPath = copyAsset(absolutePath, assetsDir);
    html = replaceAssetRef(html, ref, newRelPath);
    // Also point the embedded report JSON at the bundled asset: the interactive
    // island re-renders doc entries (screenshots, video) from that JSON, so
    // without this a bundled-and-interactive report would 404 its media on
    // client takeover. No-op for non-interactive reports (no data script).
    html = replaceAssetRefInData(html, ref, newRelPath);
    copiedCount++;
  }

  if (missing.length > 0 && !options.allowMissing) {
    throw new Error(
      `Missing asset${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`,
    );
  }

  fs.writeFileSync(htmlPath, html, "utf8");

  return {
    copiedCount,
    missingCount: missing.length,
    missing,
  };
}

/**
 * Replace an asset reference only in bundleable contexts:
 * - src="..." on <img>/<video>/<iframe> elements
 * - href="..." on <a class="attachment"> elements
 *
 * Ordinary doc links sharing the same path are left untouched.
 */
function replaceAssetRef(html: string, original: string, replacement: string): string {
  const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Rewrite src= on <img>, <video>, and <iframe>
  const srcPattern = new RegExp(
    `(<(?:img|video|iframe)\\b[^>]*?\\bsrc=["'])${escaped}(["'])`,
    "g",
  );
  html = html.replace(srcPattern, `$1${replacement}$2`);

  // Rewrite href= on <a class="attachment"> (class before href)
  const hrefClassFirst = new RegExp(
    `(<a\\b[^>]*?\\bclass=["']attachment["'][^>]*?\\bhref=["'])${escaped}(["'])`,
    "g",
  );
  html = html.replace(hrefClassFirst, `$1${replacement}$2`);

  // Rewrite href= on <a class="attachment"> (href before class)
  const hrefHrefFirst = new RegExp(
    `(<a\\b[^>]*?\\bhref=["'])${escaped}(["'][^>]*?\\bclass=["']attachment["'])`,
    "g",
  );
  html = html.replace(hrefHrefFirst, `$1${replacement}$2`);

  return html;
}

/**
 * Rewrite a path inside the embedded report JSON (`<script
 * type="application/json">…</script>`) so the interactive island, which
 * re-renders doc entries from that JSON, resolves the bundled asset. Scoped to
 * the data script (like replaceAssetRef is scoped to attributes) so ordinary
 * text that happens to match a path is left alone. Returns html unchanged when
 * there is no data script (a non-interactive report).
 */
function replaceAssetRefInData(html: string, original: string, replacement: string): string {
  const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const quoted = new RegExp(`"${escaped}"`, "g");
  return html.replace(
    /(<script\b[^>]*\btype=["']application\/json["'][^>]*>)([\s\S]*?)(<\/script>)/g,
    (_full, open: string, body: string, close: string) =>
      open + body.replace(quoted, `"${replacement}"`) + close,
  );
}
