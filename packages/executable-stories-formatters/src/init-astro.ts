/**
 * Scaffold an Astro docs site from template.
 * Uses Starlight with theme overrides matching the HTML report design system.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface InitAstroOptions {
  targetDir?: string;
  force?: boolean;
  /**
   * Refresh only the framework files (components, lib, styles, explorer page,
   * tsconfig) and merge any new framework dependencies, leaving your content
   * (ADRs, runbooks, stories), astro.config, and existing deps untouched. Lets
   * an existing site adopt template/design improvements safely.
   */
  update?: boolean;
}

export interface InitAstroResult {
  targetDir: string;
  /** Files refreshed by an `update` run (relative to the site root). */
  updatedFiles?: string[];
}

/**
 * Framework directories owned by the template — safe to overwrite on update
 * because users put their own work in src/content/docs, astro.config, and
 * package.json, never here.
 */
const FRAMEWORK_DIRS = ["src/components", "src/lib", "src/styles", "src/pages"];
/** Framework files refreshed on update (the @components alias lives in tsconfig). */
const FRAMEWORK_FILES = ["tsconfig.json"];

/**
 * A scaffolded Astro docs site is identified by its astro.config.mjs. Single
 * source of truth for the check, shared by `init-astro --update` and
 * `build-docs` (which both refuse to operate on a non-scaffolded directory).
 * existsSync on the joined path is also false when `dir` itself is missing.
 */
export function isScaffoldedAstroSite(dir: string): boolean {
  return fs.existsSync(path.join(dir, "astro.config.mjs"));
}

export function initAstro(options: InitAstroOptions = {}): InitAstroResult {
  const targetDir = options.targetDir ?? "./story-docs";
  const force = options.force ?? false;
  const update = options.update ?? false;

  // Template is at: <package-root>/templates/astro-starlight/
  // Includes Starlight with 6 theme overrides matching HTML report themes.
  const templateDir = path.resolve(__dirname, "..", "templates", "astro-starlight");

  if (!fs.existsSync(templateDir)) {
    throw new Error(
      `Template directory not found at ${templateDir}. Ensure the package is installed correctly.`,
    );
  }

  if (update) {
    return updateFrameworkFiles(templateDir, targetDir);
  }

  if (fs.existsSync(targetDir)) {
    const entries = fs.readdirSync(targetDir);
    if (entries.length > 0 && !force) {
      throw new Error(
        `Directory "${targetDir}" already exists and is not empty. Use --force to overwrite, or --update to refresh framework files only.`,
      );
    }
  }

  copyDirRecursive(templateDir, targetDir);
  return { targetDir };
}

/**
 * Refresh framework files in an existing site without touching content/config.
 */
function updateFrameworkFiles(templateDir: string, targetDir: string): InitAstroResult {
  if (!isScaffoldedAstroSite(targetDir)) {
    throw new Error(
      `"${targetDir}" does not look like a scaffolded docs site. Run init-astro (without --update) first.`,
    );
  }

  const updated: string[] = [];

  for (const dir of FRAMEWORK_DIRS) {
    const src = path.join(templateDir, dir);
    if (!fs.existsSync(src)) continue;
    copyDirRecursive(src, path.join(targetDir, dir), (rel) => updated.push(path.join(dir, rel)));
  }

  for (const file of FRAMEWORK_FILES) {
    const src = path.join(templateDir, file);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(targetDir, file));
    updated.push(file);
  }

  // Add any framework dependencies the template gained, keeping the user's deps
  // and pinned versions intact.
  if (mergeDependencies(templateDir, targetDir)) updated.push("package.json (deps)");

  return { targetDir, updatedFiles: updated };
}

/** Add template deps missing from the target's package.json. Returns true if changed. */
function mergeDependencies(templateDir: string, targetDir: string): boolean {
  const tmplPkgPath = path.join(templateDir, "package.json");
  const userPkgPath = path.join(targetDir, "package.json");
  if (!fs.existsSync(tmplPkgPath) || !fs.existsSync(userPkgPath)) return false;

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
  return changed;
}

function copyDirRecursive(
  src: string,
  dest: string,
  onFile?: (relPath: string) => void,
  baseSrc = src,
): void {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    // npm strips files named ".gitignore" from published tarballs, so the
    // template ships it as "gitignore"; restore the leading dot on copy.
    const destName = entry.name === "gitignore" ? ".gitignore" : entry.name;
    const destPath = path.join(dest, destName);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, onFile, baseSrc);
    } else {
      fs.copyFileSync(srcPath, destPath);
      onFile?.(path.relative(baseSrc, srcPath));
    }
  }
}
