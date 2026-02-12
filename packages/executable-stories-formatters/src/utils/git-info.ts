/**
 * Git information utilities.
 *
 * Read git SHA and other info from the local repository.
 */

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Read the current git SHA.
 *
 * Checks environment variables first (for CI), then reads from .git directory.
 *
 * @param cwd - Working directory to start search from
 * @returns Git SHA or undefined if not in a git repo
 */
export function readGitSha(cwd: string = process.cwd()): string | undefined {
  // Check CI environment variables first
  const envSha = process.env.GITHUB_SHA || process.env.GIT_COMMIT || process.env.CI_COMMIT_SHA;
  if (envSha) return envSha;

  // Find .git directory
  const gitDir = findGitDir(cwd);
  if (!gitDir) return undefined;

  try {
    const headPath = path.join(gitDir, "HEAD");
    const head = fs.readFileSync(headPath, "utf8").trim();

    // If HEAD is a direct SHA (detached HEAD state)
    if (!head.startsWith("ref:")) {
      return head;
    }

    // HEAD points to a ref, resolve it
    const refPath = head.replace("ref:", "").trim();
    const refFile = path.join(gitDir, refPath);

    if (fs.existsSync(refFile)) {
      return fs.readFileSync(refFile, "utf8").trim();
    }

    // Check packed-refs
    const packedRefs = path.join(gitDir, "packed-refs");
    if (fs.existsSync(packedRefs)) {
      const content = fs.readFileSync(packedRefs, "utf8");
      for (const line of content.split("\n")) {
        if (!line || line.startsWith("#") || line.startsWith("^")) continue;
        const [sha, ref] = line.split(" ");
        if (ref === refPath) return sha;
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Find the .git directory starting from a given directory.
 *
 * @param start - Directory to start search from
 * @returns Path to .git directory or undefined if not found
 */
export function findGitDir(start: string): string | undefined {
  let current = start;
  while (true) {
    const candidate = path.join(current, ".git");
    if (fs.existsSync(candidate)) {
      // Handle git worktrees where .git is a file
      const stat = fs.statSync(candidate);
      if (stat.isFile()) {
        const content = fs.readFileSync(candidate, "utf8").trim();
        const match = content.match(/^gitdir: (.+)$/);
        if (match) {
          return path.resolve(current, match[1]);
        }
      }
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

/**
 * Read the current branch name.
 *
 * @param cwd - Working directory
 * @returns Branch name or undefined
 */
export function readBranchName(cwd: string = process.cwd()): string | undefined {
  // Check CI environment variables first
  const envBranch = process.env.GITHUB_REF_NAME || process.env.CI_COMMIT_REF_NAME;
  if (envBranch) return envBranch;

  const gitDir = findGitDir(cwd);
  if (!gitDir) return undefined;

  try {
    const headPath = path.join(gitDir, "HEAD");
    const head = fs.readFileSync(headPath, "utf8").trim();

    if (head.startsWith("ref:")) {
      const refPath = head.replace("ref:", "").trim();
      // Extract branch name from refs/heads/branch-name
      const match = refPath.match(/^refs\/heads\/(.+)$/);
      return match ? match[1] : refPath;
    }

    // Detached HEAD
    return undefined;
  } catch {
    return undefined;
  }
}
