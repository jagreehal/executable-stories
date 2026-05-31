import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const monorepoRoot = path.resolve(appRoot, "../..");
const vitestPkgRoot = path.join(monorepoRoot, "packages/executable-stories-vitest");
const ensureDistScript = path.join(vitestPkgRoot, "scripts/ensure-dist.mjs");

if (!fs.existsSync(path.join(vitestPkgRoot, "package.json"))) {
  console.log("Skipping type-check: executable-stories-vitest not in workspace");
  process.exit(0);
}

execSync(`node "${ensureDistScript}"`, { stdio: "inherit" });
execSync("pnpm exec tsc --noEmit", { stdio: "inherit", cwd: appRoot });
