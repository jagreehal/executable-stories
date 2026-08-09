/**
 * `executable-stories check-links <dir>` — fail CI when docs links rot.
 *
 * Trust in documentation collapses the first time a link 404s. This scans every
 * Markdown/MDX file under a directory for broken relative links (the common
 * rot: a page was moved, renamed, or deleted) and, optionally, dead external
 * URLs. It returns a non-zero exit code so it drops straight into CI.
 *
 * The link-extraction and internal-resolution logic is pure and unit-tested;
 * only external checking touches the network.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import { collectMarkdownFiles } from "./utils/markdown-files";

export interface CheckLinksOptions {
  /** Directory (or single file) to scan. */
  target: string;
  /** Also verify external http(s) URLs over the network. Default: false. */
  checkExternal?: boolean;
  /** Per-request timeout for external checks, ms. Default: 8000. */
  externalTimeoutMs?: number;
  /**
   * Directory a root-relative link (`/guides/x/`) resolves against. Defaults to
   * the scan target, which is the content root for Astro and most static-site
   * generators.
   */
  siteRoot?: string;
  /**
   * Extra directories a root-relative link may land in, for assets served at
   * the site root rather than authored as pages (Astro's `public/`). Detected
   * automatically when omitted.
   */
  assetRoots?: string[];
}

export interface BrokenLink {
  file: string;
  link: string;
  reason: string;
}

export interface LinkReport {
  filesScanned: number;
  linksChecked: number;
  brokenCount: number;
  broken: BrokenLink[];
  externalChecked: number;
  skipped: number;
}

export type LinkKind = "external" | "internal" | "anchor" | "root" | "mail";

/** Strip fenced code blocks and inline code so example links aren't flagged. */
function stripCode(markdown: string): string {
  let out = markdown.replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1\s*$/gm, "");
  out = out.replace(/(`+)(?:(?!\1).)+\1/g, "");
  return out;
}

/** Extract every link/image/href/src target from Markdown/MDX prose. */
export function extractLinks(markdown: string): string[] {
  const stripped = stripCode(markdown);
  const found: string[] = [];

  // Markdown links and images: [text](url) / ![alt](url "title")
  const mdRe = /!?\[[^\]]*\]\(\s*<?([^)\s"'<>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdRe.exec(stripped)) !== null) {
    found.push(match[1].trim());
  }

  // href/src attributes, matched on their own rather than anchored to a tag
  // name. MDX pages pass links to components (`<ReportScreenshot src="..." />`),
  // and a tag-anchored pattern both misses the uppercase name and stops after
  // the first attribute it finds, so those links went unchecked.
  const attrRe = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  while ((match = attrRe.exec(stripped)) !== null) {
    found.push(match[1].trim());
  }

  return found.filter(Boolean);
}

export function classifyLink(link: string): LinkKind {
  if (/^(?:https?:)?\/\//i.test(link)) return "external";
  if (/^mailto:/i.test(link)) return "mail";
  if (link.startsWith("#")) return "anchor";
  if (link.startsWith("/")) return "root";
  return "internal";
}

/** Candidate filesystem paths a docs link might resolve to, from one base directory. */
function resolutionCandidates(fromDir: string, linkPath: string): string[] {
  const base = path.resolve(fromDir, linkPath);
  const candidates = [base];
  // Authors routinely omit the extension or link the directory.
  if (!path.extname(base)) {
    candidates.push(`${base}.md`, `${base}.mdx`);
    candidates.push(path.join(base, "index.md"), path.join(base, "index.mdx"));
  }
  return candidates;
}

/** Strip the anchor and query a link may carry before it names a file. */
function linkPathOf(link: string): string {
  return link.split("#")[0]!.split("?")[0]!;
}

function existsAsFile(candidate: string): boolean {
  return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
}

function resolvesFrom(dirs: string[], linkPath: string): boolean {
  return dirs.some((dir) => resolutionCandidates(dir, linkPath).some(existsAsFile));
}

/**
 * Find the `public/` directory a root-relative asset link resolves into.
 *
 * Walk up from the content root looking for the site root, recognised by its
 * `astro.config.*`. Doing this by default matters: with `/screenshots/x.png`
 * reported as broken, every real page link drowns in asset noise and the whole
 * command gets ignored.
 */
export function detectAssetRoots(target: string): string[] {
  let dir = fs.existsSync(target) && fs.statSync(target).isDirectory() ? path.resolve(target) : path.dirname(path.resolve(target));

  for (let depth = 0; depth < 6; depth++) {
    const hasConfig = ["mjs", "js", "ts", "mts"].some((ext) =>
      fs.existsSync(path.join(dir, `astro.config.${ext}`)),
    );
    const publicDir = path.join(dir, "public");
    if (hasConfig && fs.existsSync(publicDir)) return [publicDir];

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return [];
}

async function isExternalAlive(url: string, timeoutMs: number): Promise<boolean> {
  const attempt = async (method: "HEAD" | "GET") => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method, signal: controller.signal, redirect: "follow" });
      return res.status < 400;
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    return await attempt("HEAD");
  } catch {
    try {
      // Some servers reject HEAD; retry with GET before declaring it dead.
      return await attempt("GET");
    } catch {
      return false;
    }
  }
}

export async function checkLinks(options: CheckLinksOptions): Promise<LinkReport> {
  const { target, checkExternal = false, externalTimeoutMs = 8000 } = options;
  if (!fs.existsSync(target)) {
    throw new Error(`Path not found: ${target}`);
  }

  // Where `/` points. Pages live under the content root; assets served at the
  // site root live somewhere else, so both get tried.
  const siteRoot = path.resolve(options.siteRoot ?? target);
  const rootDirs = [siteRoot, ...(options.assetRoots ?? detectAssetRoots(target)).map((d) => path.resolve(d))];

  const files = collectMarkdownFiles(target);
  const broken: BrokenLink[] = [];
  let linksChecked = 0;
  let externalChecked = 0;
  let skipped = 0;

  // De-duplicate external URLs across the whole run so we hit each once.
  const externalCache = new Map<string, Promise<boolean>>();

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const link of extractLinks(content)) {
      const kind = classifyLink(link);

      if (kind === "anchor" || kind === "mail") {
        skipped += 1;
        continue;
      }

      if (kind === "root") {
        const linkPath = linkPathOf(link).replace(/^\/+/, "");
        // A bare "/" is the site home, which has no file of its own to find.
        if (linkPath === "") {
          skipped += 1;
          continue;
        }
        linksChecked += 1;
        if (!resolvesFrom(rootDirs, linkPath)) {
          broken.push({ file, link, reason: "target file not found" });
        }
        continue;
      }

      if (kind === "external") {
        if (!checkExternal) {
          skipped += 1;
          continue;
        }
        externalChecked += 1;
        linksChecked += 1;
        let pending = externalCache.get(link);
        if (!pending) {
          pending = isExternalAlive(link, externalTimeoutMs);
          externalCache.set(link, pending);
        }
        if (!(await pending)) {
          broken.push({ file, link, reason: "external URL unreachable" });
        }
        continue;
      }

      // internal relative link
      const linkPath = linkPathOf(link);
      if (linkPath === "") {
        skipped += 1;
        continue;
      }
      linksChecked += 1;
      if (!resolvesFrom([path.dirname(file)], linkPath)) {
        broken.push({ file, link, reason: "target file not found" });
      }
    }
  }

  return {
    filesScanned: files.length,
    linksChecked,
    brokenCount: broken.length,
    broken,
    externalChecked,
    skipped,
  };
}

export function formatLinkReport(report: LinkReport): string {
  const lines: string[] = [];
  lines.push(
    `Scanned ${report.filesScanned} file(s), checked ${report.linksChecked} link(s) (${report.skipped} skipped).`,
  );
  if (report.brokenCount === 0) {
    lines.push("✓ No broken links.");
  } else {
    lines.push(`✕ ${report.brokenCount} broken link(s):`);
    for (const b of report.broken) {
      lines.push(`  ${b.file}: ${b.link} — ${b.reason}`);
    }
  }
  return lines.join("\n");
}
