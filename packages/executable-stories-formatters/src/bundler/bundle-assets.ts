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
