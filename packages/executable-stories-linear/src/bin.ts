import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import { runCli } from "./cli";

const code = await runCli(process.argv.slice(2), {
  env: process.env,
  readFile: (path) => readFile(path, "utf8"),
  exists: existsSync,
  fetch: globalThis.fetch,
  out: (line) => console.log(line),
  err: (line) => console.error(line),
});
process.exitCode = code;
