/**
 * Scaffold an Astro docs site from template.
 * Uses Starlight with theme overrides matching the HTML report design system.
 */

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type PackageManager = "pnpm" | "yarn" | "bun" | "npm";

/**
 * Detect the host repo's package manager from its lockfile so `--install`
 * uses whatever the project already uses. Falls back to npm.
 */
export function detectPackageManager(cwd: string = process.cwd()): PackageManager {
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(cwd, "bun.lock")) || fs.existsSync(path.join(cwd, "bun.lockb"))) {
    return "bun";
  }
  return "npm";
}

/**
 * Spawn a package-manager command with inherited stdio. On Windows the pm
 * binaries are `.cmd` shims, which Node refuses to spawn without a shell
 * (EINVAL since the CVE-2024-27980 hardening) — every pm invocation must go
 * through here. Args are fixed words ("install", "run", "dev"), so the shell
 * path never sees untrusted input.
 */
function runPackageManager(pm: PackageManager, pmArgs: string[], cwd: string): number | null {
  const result = spawnSync(pm, pmArgs, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return result.status;
}

/**
 * Run `<pm> install` inside the scaffolded site (interactive stdio so the
 * user sees progress). Returns false when the install exits non-zero or the
 * package manager binary is missing.
 */
export function installScaffoldDependencies(targetDir: string, pm: PackageManager): boolean {
  return runPackageManager(pm, ["install"], targetDir) === 0;
}

export type DocsDevResult =
  | { kind: "not-scaffolded" }
  | { kind: "install-failed"; pm: PackageManager }
  | { kind: "dev-exited"; status: number | null };

/**
 * Body of `executable-stories dev`: verify the scaffold exists, install its
 * deps if node_modules is missing, then hand the terminal to the site's dev
 * server. Progress goes to stdout here; the CLI owns error messaging and
 * exit-code mapping. Tests still run in the user's own watcher — a docs
 * command must never own the test process.
 */
export function runDocsDev(siteDir: string): DocsDevResult {
  if (!isScaffoldedAstroSite(siteDir)) {
    return { kind: "not-scaffolded" };
  }
  const pm = detectPackageManager();
  if (!fs.existsSync(path.join(siteDir, "node_modules"))) {
    console.log(`Installing docs site dependencies with ${pm}…`);
    if (!installScaffoldDependencies(siteDir, pm)) {
      return { kind: "install-failed", pm };
    }
  }
  console.log("Tip: run your tests in watch mode in another terminal — the site hot-reloads on every run.");
  return { kind: "dev-exited", status: runPackageManager(pm, ["run", "dev"], siteDir) };
}

export interface InitAstroOptions {
  targetDir?: string;
  force?: boolean;
  /**
   * Merge any new template dependencies into an existing scaffolded site,
   * leaving your content (ADRs, runbooks, stories), astro.config, and existing
   * deps untouched. The framework itself (loader, story route, render-doc-entry)
   * ships inside `executable-stories-astro`, so framework updates arrive via
   * `pnpm update executable-stories-astro` — `--update` only reconciles deps.
   */
  update?: boolean;
}

export interface InitAstroResult {
  targetDir: string;
}

/** The distinctive file the scaffold writes; the marker for "this is ours". */
export const SCAFFOLD_MARKER = "executable-stories.config.mjs";

/**
 * A scaffolded Astro docs site is identified by its `executable-stories.config.mjs`
 * — NOT just `astro.config.mjs`, which any Astro app has. Using the distinctive
 * marker stops `init-astro --update` from silently mutating an unrelated Astro
 * project (merging template deps into it). existsSync is also false when `dir`
 * itself is missing.
 */
export function isScaffoldedAstroSite(dir: string): boolean {
  return fs.existsSync(path.join(dir, SCAFFOLD_MARKER));
}

export function initAstro(options: InitAstroOptions = {}): InitAstroResult {
  const targetDir = options.targetDir ?? "./story-docs";
  const force = options.force ?? false;
  const update = options.update ?? false;

  // Thin scaffold: Starlight + the executable-stories-astro integration. The
  // framework (loader, story route, render-doc-entry) lives in the package, not
  // in the copied files — so the scaffold is ~8 user-owned files.
  const templateDir = path.resolve(__dirname, "..", "templates", "astro-thin");

  if (!fs.existsSync(templateDir)) {
    throw new Error(
      `Template directory not found at ${templateDir}. Ensure the package is installed correctly.`,
    );
  }

  if (update) {
    return updateScaffoldDeps(templateDir, targetDir);
  }

  if (fs.existsSync(targetDir)) {
    const entries = fs.readdirSync(targetDir);
    if (entries.length > 0 && !force) {
      throw new Error(
        `Directory "${targetDir}" already exists and is not empty. ` +
          `Use --force to overlay the template (existing files are kept; ` +
          `same-path template files are overwritten), or --update to refresh ` +
          `framework files only.`,
      );
    }
  }

  copyDirRecursive(templateDir, targetDir);
  return { targetDir };
}

/**
 * Reconcile template dependencies into an existing site without touching
 * content/config. The framework ships in `executable-stories-astro`, so there
 * are no framework files to refresh — only new deps to merge in.
 */
function updateScaffoldDeps(templateDir: string, targetDir: string): InitAstroResult {
  if (!isScaffoldedAstroSite(targetDir)) {
    throw new Error(
      `"${targetDir}" does not look like a scaffolded docs site. Run init-astro (without --update) first.`,
    );
  }

  // Add any dependencies the template gained, keeping the user's deps and
  // pinned versions intact.
  mergeDependencies(templateDir, targetDir);

  return { targetDir };
}

/** Add template deps missing from the target's package.json. */
function mergeDependencies(templateDir: string, targetDir: string): void {
  const tmplPkgPath = path.join(templateDir, "package.json");
  const userPkgPath = path.join(targetDir, "package.json");
  if (!fs.existsSync(tmplPkgPath) || !fs.existsSync(userPkgPath)) return;

  const tmpl = JSON.parse(fs.readFileSync(tmplPkgPath, "utf8")) as {
    dependencies?: Record<string, string>;
  };
  const user = JSON.parse(fs.readFileSync(userPkgPath, "utf8")) as {
    dependencies?: Record<string, string>;
  };
  user.dependencies = user.dependencies ?? {};

  let changed = false;
  for (const [name, version] of Object.entries(tmpl.dependencies ?? {})) {
    if (!(name in user.dependencies)) {
      user.dependencies[name] = version;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(userPkgPath, `${JSON.stringify(user, null, 2)}\n`, "utf8");
  }
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    // npm strips files named ".gitignore" from published tarballs, so the
    // template ships it as "gitignore"; restore the leading dot on copy.
    const destName = entry.name === "gitignore" ? ".gitignore" : entry.name;
    const destPath = path.join(dest, destName);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
