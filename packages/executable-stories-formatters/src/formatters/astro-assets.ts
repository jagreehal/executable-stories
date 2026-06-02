import * as fs from "node:fs";
import * as path from "node:path";
import { copyAsset } from "../bundler/copy-asset";

export interface AstroAssetResult {
  markdown: string;
  copiedCount: number;
  missingCount: number;
  missing: string[];
}

export interface CopyMarkdownAssetsOptions {
  markdown: string;
  markdownDir: string;
  assetsDir: string;
  assetsBaseUrl: string;
  allowMissing?: boolean;
}

const SKIP_PREFIXES = ["http://", "https://", "data:", "#"];

function isLocalPath(src: string): boolean {
  const trimmed = src.trim();
  if (SKIP_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return false;
  }

  // Root-relative, protocol-relative, and absolute filesystem paths are not
  // relative to the markdown file and should not be copied from markdownDir.
  return !path.posix.isAbsolute(trimmed) && !path.win32.isAbsolute(trimmed);
}

/** Strip fenced code blocks and inline code spans so their contents aren't treated as real references. */
function stripCodeContent(markdown: string): string {
  // Strip fenced code blocks (allow leading whitespace for indented fences in lists/quotes)
  let result = markdown.replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1\s*$/gm, "");
  // Strip inline code spans — backreference ensures opening and closing delimiters match
  result = result.replace(/(`+)(?:(?!\1).)+\1/g, "");
  // Strip HTML code/pre blocks so literal snippets are not scanned as assets
  result = result.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, "");
  result = result.replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, "");
  return result;
}

/**
 * Scan markdown for local asset references (images, videos).
 * Returns an array of unique local paths found.
 * Ignores references inside fenced code blocks.
 */
export function scanMarkdownAssets(markdown: string): string[] {
  const found = new Set<string>();
  const stripped = stripCodeContent(markdown);

  // Markdown image syntax: ![alt](path) or ![alt](path "title")
  const mdImageRe = /!\[[^\]]*\]\(([^)"'\s]+)(?:\s+["'][^"']*["'])?\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdImageRe.exec(stripped)) !== null) {
    const src = match[1].trim();
    if (isLocalPath(src)) {
      found.add(src);
    }
  }

  // HTML tags: <img src="...">, <source src="...">, <video src="...">
  const htmlSrcRe = /<(?:img|source|video)[^>]+\bsrc=["']([^"']+)["'][^>]*>/gi;
  while ((match = htmlSrcRe.exec(stripped)) !== null) {
    const src = match[1].trim();
    if (isLocalPath(src)) {
      found.add(src);
    }
  }

  // Video poster frames: <video ... poster="...">
  const posterRe = /<video[^>]+\bposter=["']([^"']+)["'][^>]*>/gi;
  while ((match = posterRe.exec(stripped)) !== null) {
    const src = match[1].trim();
    if (isLocalPath(src)) {
      found.add(src);
    }
  }

  return Array.from(found);
}

/**
 * Split markdown into alternating [prose, code, prose, code, ...] segments.
 * Fenced code blocks and inline code spans are returned verbatim;
 * only prose segments are rewritten.
 */
function splitByCode(markdown: string): string[] {
  // Match fenced code blocks (with optional indentation), HTML code blocks, or inline code spans.
  const codeRe =
    /^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1\s*$|<pre\b[^>]*>[\s\S]*?<\/pre>|<code\b[^>]*>[\s\S]*?<\/code>|(`+)(?:(?!\2).)+\2/gim;
  const segments: string[] = [];
  let lastIndex = 0;

  for (const match of markdown.matchAll(codeRe)) {
    if (match.index! > lastIndex) {
      segments.push(markdown.slice(lastIndex, match.index!));
    }
    segments.push(match[0]); // code — preserved as-is
    lastIndex = match.index! + match[0].length;
  }
  if (lastIndex < markdown.length) {
    segments.push(markdown.slice(lastIndex));
  }
  return segments;
}

/** Returns true if segment is a code block or inline code span. */
function isCode(segment: string): boolean {
  const trimmed = segment.trimStart();
  return trimmed.startsWith("`") || trimmed.startsWith("~") || trimmed.startsWith("<pre") || trimmed.startsWith("<code");
}

/** Rewrite asset paths in a single prose (non-fenced) segment. */
function rewriteProseSegment(
  prose: string,
  assetsBaseUrl: string,
  pathMap?: Map<string, string>,
): string {
  let result = prose;

  // Rewrite markdown image syntax: ![alt](path) or ![alt](path "title")
  result = result.replace(
    /(!\[[^\]]*\]\()([^)"'\s]+)((?:\s+["'][^"']*["'])?\s*\))/g,
    (full, pre, src, post) => {
      const trimmed = src.trim();
      if (!isLocalPath(trimmed)) return full;
      if (pathMap) {
        const mapped = pathMap.get(trimmed);
        if (mapped === undefined) return full;
        return `${pre}${assetsBaseUrl}/${mapped}${post}`;
      }
      return `${pre}${assetsBaseUrl}/${trimmed}${post}`;
    },
  );

  // Rewrite HTML src attributes in img/source/video tags
  result = result.replace(
    /(<(?:img|source|video)[^>]+\bsrc=["'])([^"']+)(["'][^>]*>)/gi,
    (full, pre, src, post) => {
      const trimmed = src.trim();
      if (!isLocalPath(trimmed)) return full;
      if (pathMap) {
        const mapped = pathMap.get(trimmed);
        if (mapped === undefined) return full;
        return `${pre}${assetsBaseUrl}/${mapped}${post}`;
      }
      return `${pre}${assetsBaseUrl}/${trimmed}${post}`;
    },
  );

  // Rewrite poster attributes on video tags
  result = result.replace(
    /(<video[^>]+\bposter=["'])([^"']+)(["'][^>]*>)/gi,
    (full, pre, src, post) => {
      const trimmed = src.trim();
      if (!isLocalPath(trimmed)) return full;
      if (pathMap) {
        const mapped = pathMap.get(trimmed);
        if (mapped === undefined) return full;
        return `${pre}${assetsBaseUrl}/${mapped}${post}`;
      }
      return `${pre}${assetsBaseUrl}/${trimmed}${post}`;
    },
  );

  return result;
}

/**
 * Rewrite local asset paths in markdown using a path map or a base URL.
 * Paths not present in the pathMap are left unchanged.
 * Content inside fenced code blocks and inline code spans is never rewritten.
 */
export function rewriteAssetPaths(
  markdown: string,
  assetsBaseUrl: string,
  pathMap?: Map<string, string>,
): string {
  return splitByCode(markdown)
    .map((seg) => (isCode(seg) ? seg : rewriteProseSegment(seg, assetsBaseUrl, pathMap)))
    .join("");
}

/**
 * Full pipeline: scan markdown for local asset refs, copy them to assetsDir
 * with content-hashed names, and rewrite the paths in the markdown.
 */
export function copyMarkdownAssets(options: CopyMarkdownAssetsOptions): AstroAssetResult {
  const {
    markdown,
    markdownDir,
    assetsDir,
    assetsBaseUrl,
    allowMissing = false,
  } = options;

  const refs = scanMarkdownAssets(markdown);
  const pathMap = new Map<string, string>();
  const missing: string[] = [];

  for (const ref of refs) {
    const absPath = path.resolve(markdownDir, ref);
    if (!fs.existsSync(absPath)) {
      if (!allowMissing) {
        throw new Error(`Asset not found: ${absPath}`);
      }
      missing.push(ref);
      continue;
    }
    // copyAsset returns "assets/<hashed-name>"
    const relativeCopied = copyAsset(absPath, assetsDir);
    // Strip leading "assets/" prefix since assetsBaseUrl already points there
    const fileName = relativeCopied.replace(/^assets\//, "");
    pathMap.set(ref, fileName);
  }

  const rewritten = rewriteAssetPaths(markdown, assetsBaseUrl, pathMap);

  return {
    markdown: rewritten,
    copiedCount: pathMap.size,
    missingCount: missing.length,
    missing,
  };
}
