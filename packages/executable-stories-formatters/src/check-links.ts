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

  // HTML href/src attributes
  const htmlRe = /<[a-z][^>]*\b(?:href|src)=["']([^"']+)["']/gi;
  while ((match = htmlRe.exec(stripped)) !== null) {
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

/** Candidate filesystem paths a relative docs link might resolve to. */
function resolutionCandidates(fromFile: string, link: string): string[] {
  const withoutAnchor = link.split("#")[0];
  if (!withoutAnchor) return [];
  const base = path.resolve(path.dirname(fromFile), withoutAnchor);
  const candidates = [base];
  // Authors routinely omit the extension or link the directory.
  if (!path.extname(base)) {
    candidates.push(`${base}.md`, `${base}.mdx`);
    candidates.push(path.join(base, "index.md"), path.join(base, "index.mdx"));
  }
  return candidates;
}

function resolvesOnDisk(fromFile: string, link: string): boolean {
  return resolutionCandidates(fromFile, link).some(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  );
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

      if (kind === "anchor" || kind === "mail" || kind === "root") {
        // Anchors, mailto, and root-relative (need build routing) aren't checked.
        skipped += 1;
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
      linksChecked += 1;
      if (!resolvesOnDisk(file, link)) {
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
