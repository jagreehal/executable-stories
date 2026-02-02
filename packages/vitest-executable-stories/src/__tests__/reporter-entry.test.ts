/**
 * Regression: reporter subpath can be imported in a plain Node process without pulling in Vitest.
 * This test must run after build; it imports vitest-executable-stories/reporter so resolution
 * uses package exports and the built dist. Run from repo root so the workspace package resolves.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../");
const scriptPathMjs = path.resolve(__dirname, "fixtures/reporter-entry.mjs");
const scriptPathCjs = path.resolve(__dirname, "fixtures/reporter-entry.cjs");

describe("reporter entry (no Vitest)", () => {
  it("ESM: imports vitest-executable-stories/reporter in plain Node and exposes a callable export", () => {
    // .mjs is ESM by default; do not use --input-type=module with a file path (Node disallows it)
    const result = spawnSync(
      "node",
      [scriptPathMjs],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: { ...process.env },
      },
    );
    if (result.stderr) console.log(result.stderr);
    if (result.stdout) console.log(result.stdout);
    expect(result.status).toBe(0);
  });

  it("CJS: requires vitest-executable-stories/reporter and exposes a callable export", () => {
    const result = spawnSync("node", [scriptPathCjs], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env },
    });
    if (result.stderr) console.log(result.stderr);
    if (result.stdout) console.log(result.stdout);
    expect(result.status).toBe(0);
  });
});
