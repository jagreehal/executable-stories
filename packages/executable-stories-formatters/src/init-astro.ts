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
}

export interface InitAstroResult {
  targetDir: string;
}

export function initAstro(options: InitAstroOptions = {}): InitAstroResult {
  const targetDir = options.targetDir ?? "./story-docs";
  const force = options.force ?? false;

  if (fs.existsSync(targetDir)) {
    const entries = fs.readdirSync(targetDir);
    if (entries.length > 0 && !force) {
      throw new Error(
        `Directory "${targetDir}" already exists and is not empty. Use --force to overwrite.`,
      );
    }
  }

  // Template is at: <package-root>/templates/astro-starlight/
  // Includes Starlight with 6 theme overrides matching HTML report themes.
  const templateDir = path.resolve(__dirname, "..", "templates", "astro-starlight");

  if (!fs.existsSync(templateDir)) {
    throw new Error(
      `Template directory not found at ${templateDir}. Ensure the package is installed correctly.`,
    );
  }

  copyDirRecursive(templateDir, targetDir);
  return { targetDir };
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
