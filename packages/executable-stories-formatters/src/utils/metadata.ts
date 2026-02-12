/**
 * Metadata utilities for reading package information.
 */

import * as fs from "node:fs";
import * as path from "node:path";

/** Cache for package versions by root directory */
const versionCache = new Map<string, string | undefined>();

/**
 * Read the package version from the closest package.json.
 *
 * Results are cached by root directory.
 *
 * @param root - Directory to start searching from
 * @returns Package version string or undefined if not found
 */
export function readPackageVersion(root: string): string | undefined {
  if (versionCache.has(root)) {
    return versionCache.get(root);
  }

  const version = findPackageVersion(root);
  versionCache.set(root, version);
  return version;
}

/**
 * Find package.json version by walking up the directory tree.
 */
function findPackageVersion(startDir: string): string | undefined {
  let current = path.resolve(startDir);

  while (true) {
    const pkgPath = path.join(current, "package.json");
    try {
      if (fs.existsSync(pkgPath)) {
        const raw = fs.readFileSync(pkgPath, "utf8");
        const parsed = JSON.parse(raw) as { version?: string };
        return parsed.version;
      }
    } catch {
      // Continue searching
    }

    const parent = path.dirname(current);
    if (parent === current) {
      // Reached root
      return undefined;
    }
    current = parent;
  }
}

/**
 * Clear the package version cache.
 * Useful for testing.
 */
export function clearVersionCache(): void {
  versionCache.clear();
}
