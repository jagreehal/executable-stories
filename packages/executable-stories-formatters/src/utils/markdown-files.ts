/**
 * Shared Markdown/MDX file discovery for docs tooling.
 */

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Recursively collect Markdown/MDX files under `target`.
 *
 * - A file target returns itself (the caller asked for it explicitly).
 * - A directory is walked, skipping dotfiles and `node_modules`.
 * - A missing target returns `[]` rather than throwing, so optional doc
 *   directories (e.g. an absent `notes/`) are safe to scan.
 */
export function collectMarkdownFiles(target: string): string[] {
  if (!fs.existsSync(target)) return [];
  if (fs.statSync(target).isFile()) return [target];

  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.mdx?$/u.test(entry.name)) out.push(full);
    }
  };
  walk(target);
  return out;
}
