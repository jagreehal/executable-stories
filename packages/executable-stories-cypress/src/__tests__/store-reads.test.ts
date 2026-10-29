/**
 * The reporter reads each recorded story from disk once per spec. getMeta and
 * getAttachments run per test and read memory, so disk reads grow with the
 * number of scenarios.
 */
import { describe, it, expect, vi } from "vitest";
import * as os from "node:os";
import * as path from "node:path";

const reads: string[] = [];
vi.mock("node:fs", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs")>();
  // The store opens each file once, then reads it through the descriptor.
  const openSync = ((file: string, ...rest: unknown[]) => {
    reads.push(String(file));
    return (real.openSync as (...a: unknown[]) => unknown)(file, ...rest);
  }) as typeof real.openSync;
  return { ...real, default: { ...real, openSync }, openSync };
});

const { recordMeta } = await import("../store");
const { default: createReporter } = await import("../reporter");

describe("store reads", () => {
  it("reads each recorded story once for a 100-scenario spec", () => {
    const spec = "cypress/e2e/many.cy.ts";
    const suite = { title: "", suites: [] as unknown[], tests: [] as unknown[] };
    for (let i = 0; i < 100; i++) {
      recordMeta({ specRelative: spec, titlePath: [`t${i}`], meta: { scenario: `t${i}`, steps: [] } });
      suite.tests.push({ title: `t${i}`, state: "passed", parent: suite, fn: () => {} });
    }

    let end: () => void = () => {};
    const runner = { suite, on: (event: string, cb: () => void) => event === "end" && (end = cb) };
    const outputDir = path.join(os.tmpdir(), "es-cypress-reads");
    createReporter(runner as never, { reporterOptions: { formats: [], outputDir, specPath: spec } } as never);
    reads.length = 0;
    end();

    const storeDir = process.env.EXECUTABLE_STORIES_CYPRESS_STORE!;
    // Reads only: the writes above were cleared before end().
    expect(reads.filter((f) => f.startsWith(storeDir))).toHaveLength(100);
  });
});
