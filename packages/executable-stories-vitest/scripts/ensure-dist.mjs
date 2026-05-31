import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredDeclarations = ["dist/index.d.ts", "dist/reporter.d.ts"];

function declarationArtifactReady(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    return false;
  }
  const contents = fs.readFileSync(fullPath, "utf8");
  return contents.includes("export");
}

function distReady() {
  return requiredDeclarations.every(declarationArtifactReady);
}

if (!distReady()) {
  execSync("pnpm exec tsup && node scripts/verify-dist.mjs", {
    cwd: root,
    stdio: "inherit",
  });
}

if (!distReady()) {
  console.error(
    "executable-stories-vitest: declaration artifacts are missing or incomplete after build",
  );
  process.exit(1);
}
