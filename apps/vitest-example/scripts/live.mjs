#!/usr/bin/env node
// Live docs demo: run Vitest in watch mode and serve the story report at a URL
// that reloads — and shows "what changed since you started" — on every run.
//
// This is the "loop engineering" experience in miniature: edit a test (or let a
// coding agent loop do it), and watch the behaviour catalogue update in realtime
// at http://127.0.0.1:4321. Vitest's reporter rewrites reports/raw-run.json on
// each pass; `executable-stories serve` watches that file.
import { spawn } from "node:child_process";
import path from "node:path";

const ext = process.platform === "win32" ? ".cmd" : "";
const bin = (name) => path.join(process.cwd(), "node_modules", ".bin", name + ext);

const children = [
  // Vitest watch mode rewrites reports/raw-run.json after every run.
  // `--watch` forces watch even in a non-TTY/CI shell, so the demo never
  // runs-once-and-exits out from under the server.
  spawn(bin("vitest"), ["--watch"], { stdio: "inherit" }),
  // serve tolerates the file not existing yet — it waits for the first run.
  spawn(
    bin("executable-stories"),
    ["serve", "reports/raw-run.json", "--output-dir", "reports", "--output-name", "live"],
    { stdio: "inherit" },
  ),
];

const shutdown = () => {
  for (const child of children) child.kill("SIGTERM");
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
// If either process dies, tear the whole demo down so it never half-runs.
for (const child of children) child.on("exit", shutdown);
