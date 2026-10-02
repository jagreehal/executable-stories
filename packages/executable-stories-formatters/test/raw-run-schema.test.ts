/**
 * The raw-run schema is the adapter contract. It rejects unknown properties, so
 * anything an adapter learns to emit has to be declared here or the documented
 * CI flow (`executable-stories format reports/raw-run.json`) rejects the file
 * the adapter just wrote.
 */
import { describe, expect, it } from "vitest";

import { validateRawRun } from "../src/validation/schema-validator";

function run(extra: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    projectRoot: "/repo",
    startedAtMs: 1,
    finishedAtMs: 2,
    testCases: [
      {
        title: "refuses a negative amount",
        sourceFile: "src/pay.test.ts",
        sourceLine: 1,
        status: "pass",
        story: {
          scenario: "refuses a negative amount",
          steps: [{ keyword: "given", text: "an amount" }],
        },
      },
    ],
    ...extra,
  };
}

describe("raw-run schema", () => {
  it("accepts an ordinary run", () => {
    expect(validateRawRun(run()).valid).toBe(true);
  });

  it("accepts a run that states how much of its files it covered", () => {
    // What the adapters now write. Rejecting either would break the documented
    // `pnpm test` -> `executable-stories format` flow.
    expect(validateRawRun(run({ runScope: "filtered" })).valid).toBe(true);
    expect(validateRawRun(run({ runScope: "full" })).valid).toBe(true);
  });

  it("accepts the inventory of files a run executed", () => {
    expect(
      validateRawRun(run({ coveredSourceFiles: ["src/pay.test.ts"] })).valid
    ).toBe(true);
  });

  it("rejects a scope it has no rule for", () => {
    // A typo must not read as "unknown scope" and silently change merge
    // behaviour; it should stop the run.
    expect(validateRawRun(run({ runScope: "partial" })).valid).toBe(false);
  });

  it("still rejects a property no adapter should be writing", () => {
    expect(validateRawRun(run({ nonsense: true })).valid).toBe(false);
  });
});

describe("raw-run schema, read tolerantly", () => {
  // A newer adapter can add a field or a doc kind before this CLI knows it.
  // `format` must still render the run; `validate` (strict) still flags it.
  const newer = run();
  Object.assign(newer.testCases[0]!.story, {
    futureField: 1,
    docs: [
      { kind: "note", text: "kept", phase: "static", futureField: 1 },
      { kind: "hologram", phase: "runtime", frames: 3 },
    ],
  });

  it("accepts unknown fields and doc kinds, and says it ignored them", () => {
    expect(validateRawRun(newer, { tolerateUnknown: true })).toEqual({
      valid: true,
      errors: [],
      ignoredUnknown: true,
    });
    expect(validateRawRun(newer).valid).toBe(false);
  });

  it("still rejects a known field with the wrong shape", () => {
    expect(validateRawRun(run({ runScope: "partial" }), { tolerateUnknown: true }).valid).toBe(false);
  });
});
