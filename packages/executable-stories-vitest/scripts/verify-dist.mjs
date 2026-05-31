import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const file of ["dist/index.d.ts", "dist/reporter.d.ts"]) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`executable-stories-vitest build: missing ${file}`);
    process.exit(1);
  }
  const contents = fs.readFileSync(fullPath, "utf8");
  if (!contents.includes("export")) {
    console.error(`executable-stories-vitest build: invalid ${file} (no exports)`);
    process.exit(1);
  }
}
