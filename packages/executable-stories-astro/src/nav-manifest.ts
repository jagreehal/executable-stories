/**
 * Nav manifest — keeps the Starlight sidebar fresh without manual restarts.
 *
 * The sidebar feature/scenario tree (`storiesSidebar`) is computed when
 * `astro.config` loads, but the run JSON changes on every test run. Page
 * content hot-reloads through the content layer; the sidebar cannot — Astro
 * only rebuilds it on a dev-server restart. So the integration registers this
 * manifest file with `addWatchFile`, and the loader rewrites it whenever a
 * resync produces a *different nav tree* (scenario/feature added, renamed, or
 * removed). Astro sees the watched file change and restarts, rebuilding the
 * sidebar. Status-only changes leave the fingerprint untouched, so the common
 * red/green loop stays pure HMR — no restart.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type ExecutableStoriesConfig } from "./config.js";
import { storyNavItems } from "./sidebar-nav.js";

/** Resolve Astro's `config.root` (URL, file: string, or plain path) to a path. */
export function toRootPath(root: URL | string | undefined): string {
  if (!root) return process.cwd();
  if (typeof root === "string") {
    return root.startsWith("file:") ? fileURLToPath(root) : root;
  }
  return fileURLToPath(root);
}

/** Where the manifest lives — inside Astro's own generated (gitignored) dir. */
export function navManifestPath(root: string): string {
  return path.join(root, ".astro", "executable-stories", "nav-manifest.json");
}

/**
 * The sidebar nav tree serialised — labels, links, and grouping. Anything that
 * would render differently in the sidebar changes this string; anything that
 * wouldn't (status flips, durations, doc content) cannot.
 */
export function navFingerprint(config: ExecutableStoriesConfig): string {
  return JSON.stringify(storyNavItems(config));
}

/**
 * Write the manifest only when the nav tree changed since the last write.
 * Returns true when a write happened (i.e. a dev-server restart is coming).
 * Idempotent on restart: the integration re-syncs at config load, finds the
 * fingerprint unchanged, and does not write — so no restart loop.
 */
export function syncNavManifest(root: string, config: ExecutableStoriesConfig): boolean {
  const file = navManifestPath(root);
  const next = navFingerprint(config);
  let prev: string | undefined;
  try {
    prev = fs.readFileSync(file, "utf8");
  } catch {
    // First run — no manifest yet.
  }
  if (prev === next) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, next);
  return true;
}
