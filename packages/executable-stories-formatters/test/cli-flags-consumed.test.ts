/**
 * Every flag the parser accepts must be read by something.
 *
 * Config-file `defaults` can set any of them, so a flag with no reader is a
 * project setting that quietly does nothing — worth holding as an invariant
 * across all 70-odd rather than spotting one at a time.
 *
 * Reads the source because `cli.ts` runs `main()` on import and so cannot be
 * imported here. Crude, and cheap: it fails the moment someone adds a flag
 * with no reader.
 */
import * as fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cliSource = fs.readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../src/cli.ts"),
  "utf8",
);

/** The flag names in the parseArgs options table. */
function declaredFlags(source: string): string[] {
  const start = source.indexOf("const CLI_OPTIONS = {");
  const end = source.indexOf("} as const satisfies", start);
  expect(start, "CLI_OPTIONS table not found — this test needs updating").toBeGreaterThan(-1);
  const table = source.slice(start, end);
  return [...table.matchAll(/^\s*'?([a-z0-9-]+)'?:\s*\{\s*type:/gm)].map((m) => m[1]!);
}

describe("CLI flags", () => {
  it("declares no flag that nothing reads", () => {
    const unread = declaredFlags(cliSource).filter(
      (flag) =>
        !cliSource.includes(`values['${flag}']`) &&
        !cliSource.includes(`values["${flag}"]`) &&
        !cliSource.includes(`values.${flag}`),
    );
    expect(unread).toEqual([]);
  });

  it("finds the flags it is checking", () => {
    // Guards the guard: a regex that stops matching the table would otherwise
    // pass the test above with an empty list.
    const flags = declaredFlags(cliSource);
    expect(flags.length).toBeGreaterThan(50);
    expect(flags).toContain("synthesize-stories");
    expect(flags).toContain("no-synthesize-stories");
  });
});
