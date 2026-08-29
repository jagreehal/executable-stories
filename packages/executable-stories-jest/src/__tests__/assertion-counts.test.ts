/**
 * Assertions observed per step, end to end through the Jest reporter.
 *
 * Jest keeps a live per-test assertion counter, so the count is observed rather
 * than declared. Both step styles have to land on the right step: a wrapped
 * step measures its own body, a marker takes the assertions that follow it.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "@jest/globals";
import { runJest } from "./helpers/command";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(__dirname, "fixtures", "assertions");
const fixtureConfig = path.resolve(__dirname, "fixtures", "jest.assertions.config.mjs");

interface RawStep { text: string; assertions?: number }
interface RawCase { title: string; story: { steps: RawStep[] } }

describe("assertions observed per step", () => {
  let byTitle: Map<string, RawStep[]>;

  beforeAll(async () => {
    await fs.rm(path.join(fixtureDir, "dist"), { recursive: true, force: true });
    runJest(fixtureConfig, {
      GITHUB_ACTIONS: undefined,
      GITHUB_SHA: undefined,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --experimental-vm-modules`.trim(),
    });
    const raw = JSON.parse(
      await fs.readFile(path.join(fixtureDir, "dist", "raw-run.json"), "utf-8"),
    ) as { testCases: RawCase[] };
    // Jest's title carries the describe prefix; match on the it() name.
    byTitle = new Map(raw.testCases.map((tc) => [tc.title.replace(/^Calculator /, ""), tc.story.steps]));
  }, 120_000);

  it("counts the assertions a wrapped step made", () => {
    const steps = byTitle.get("counts assertions inside a wrapped step")!;
    expect(steps[1].assertions).toBe(1);
  });

  it("credits a trailing assertion to the marker step it follows", () => {
    const steps = byTitle.get("counts assertions following a marker step")!;
    expect(steps[1].assertions).toBe(1);
  });

  it("records zero for a claim that checked nothing", () => {
    const steps = byTitle.get("reports a claim that checked nothing")!;
    expect(steps[1].assertions).toBe(0);
  });

  it("does not credit the setup step with the claim's assertions", () => {
    const steps = byTitle.get("counts assertions following a marker step")!;
    expect(steps[0].assertions).toBe(0);
  });
});
