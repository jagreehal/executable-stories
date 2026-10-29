/**
 * A failing story test lists its steps in the failure, and the reporter both
 * prints that and keeps it out of the report. Also covers how story data
 * crosses Cypress's two splits: the spec and support file are separate
 * bundles, and the plugin and reporter are separate Node processes.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { baseDir } from "../store";

const currentTest = { title: "test", titlePath: ["Suite", "test"] };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Cypress = { currentTest, spec: { relative: "cypress/e2e/trail.cy.ts" } };

/** A command queue: `cy.then` queues, `run(n)` runs the first n queued commands. */
const queue: Array<() => void> = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).cy = { then: (fn: () => void) => queue.push(fn) };
const run = (n = queue.length) => queue.splice(0, n).forEach((fn) => fn());

const { story, stepTrail, getAndClearMeta } = await import("../story-api");
const { STEP_TRAIL_MARKER } = await import("../step-trail");

const trail = (...lines: string[]) => STEP_TRAIL_MARKER + lines.join("\n");

afterEach(() => {
  queue.length = 0;
  getAndClearMeta();
});

describe("stepTrail", () => {
  it("a failure in the test body marks the last step written", () => {
    story.init();
    story.given("a balance of 50");
    story.then("the balance is 150");
    // expect() throws here, before the queue starts
    expect(stepTrail()).toBe(trail("  ✓ Given a balance of 50", "  ✗ Then the balance is 150"));
  });

  it("a wrapped body that throws is the failing step", () => {
    story.init();
    story.given("setup", () => {});
    expect(() =>
      story.when("it breaks", () => {
        throw new Error("kaput");
      }),
    ).toThrow("kaput");
    expect(stepTrail()).toBe(trail("  ✓ Given setup", "  ✗ When it breaks"));
  });

  it("a failing command marks the last step the queue reached; later steps never ran", () => {
    story.init();
    story.given("a value");
    story.when("it is checked");
    story.then("never reached");
    run(3); // init, Given, When; the command after When fails
    expect(stepTrail()).toBe(
      trail("  ✓ Given a value", "  ✗ When it is checked", "  · Then never reached"),
    );
  });

  it("a caught throw does not own a later failure", () => {
    story.init();
    expect(() =>
      story.given("a rejected input", () => {
        throw new Error("rejected");
      }),
    ).toThrow("rejected");
    story.then("the total is 3");
    expect(stepTrail()).toBe(trail("  ✓ Given a rejected input", "  ✗ Then the total is 3"));
  });

  it("nested steps mark the inner one that threw", () => {
    story.init();
    expect(() =>
      story.when("the order is placed", () => {
        story.and("payment is taken", () => {
          throw new Error("declined");
        });
      }),
    ).toThrow("declined");
    expect(stepTrail()).toBe(trail("  ✓ When the order is placed", "  ✗ And payment is taken"));
  });

  it("a command failing before the first step says so", () => {
    story.init();
    story.given("a value");
    run(1); // only init's marker ran
    expect(stepTrail()).toBe(trail("  ✗ (failed before the first step)", "  · Given a value"));
  });
});

describe("the support file's copy of the story API", () => {
  it("sees the story the spec's copy started", async () => {
    story.init();
    story.given("a value");
    vi.resetModules();
    const other = await import("../story-api");
    expect(other.getAndClearMeta()?.meta.steps.map((s) => s.text)).toEqual(["a value"]);
  });
});

describe("store", () => {
  const entry = {
    specRelative: "cypress/e2e/trail.cy.ts",
    titlePath: ["Suite", "test"],
    meta: { scenario: "test", steps: [] },
  };
  const override = process.env.EXECUTABLE_STORIES_CYPRESS_STORE;

  afterEach(() => {
    process.env.EXECUTABLE_STORIES_CYPRESS_STORE = override;
  });

  it("the plugin records under its parent's pid, which the reporter reads as its own", async () => {
    delete process.env.EXECUTABLE_STORIES_CYPRESS_STORE;
    vi.resetModules();
    const store = await import("../store");
    store.recordMeta(entry);
    const pluginDir = path.join(baseDir(), String(process.ppid));
    try {
      expect(fs.readdirSync(pluginDir).some((f) => /^es-[0-9a-f]{16}\.json$/.test(f))).toBe(true);
      // Getters read memory only, and a load replaces memory with the directory it reads.
      store.loadStore(path.join(baseDir(), String(process.pid)));
      expect(store.getMeta(entry.specRelative, entry.titlePath)).toBeUndefined();
      store.loadStore(pluginDir);
      expect(store.getMeta(entry.specRelative, entry.titlePath)?.scenario).toBe("test");
      expect(store.storeDir(process.pid)).toBe(path.join(baseDir(), String(process.pid)));
    } finally {
      fs.rmSync(pluginDir, { recursive: true, force: true });
    }
  });
});


describe("clearStore", () => {
  it("deletes only the files the store wrote", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-cypress-clear-"));
    const override = process.env.EXECUTABLE_STORIES_CYPRESS_STORE;
    process.env.EXECUTABLE_STORIES_CYPRESS_STORE = dir;
    try {
      fs.writeFileSync(path.join(dir, "raw-run.json"), "{}");
      vi.resetModules();
      const store = await import("../store");
      store.recordMeta({ specRelative: "a.cy.ts", titlePath: ["t"], meta: { scenario: "t", steps: [] } });
      store.clearStore();
      expect(fs.readdirSync(dir)).toEqual(["raw-run.json"]);
    } finally {
      process.env.EXECUTABLE_STORIES_CYPRESS_STORE = override;
    }
  });
});

describe("store directory", () => {
  it("refuses a store directory that is a symlink", async () => {
    const target = fs.mkdtempSync(path.join(os.tmpdir(), "es-cypress-target-"));
    const link = path.join(os.tmpdir(), `es-cypress-link-${process.pid}`);
    try {
      fs.unlinkSync(link);
    } catch {
      // No link left from an earlier run.
    }
    fs.symlinkSync(target, link);
    const override = process.env.EXECUTABLE_STORIES_CYPRESS_STORE;
    process.env.EXECUTABLE_STORIES_CYPRESS_STORE = link;
    try {
      vi.resetModules();
      const store = await import("../store");
      expect(() =>
        store.recordMeta({ specRelative: "a.cy.ts", titlePath: ["t"], meta: { scenario: "t", steps: [] } }),
      ).toThrow("refusing store directory");
      expect(fs.readdirSync(target)).toEqual([]);
    } finally {
      process.env.EXECUTABLE_STORIES_CYPRESS_STORE = override;
      fs.unlinkSync(link);
      fs.rmSync(target, { recursive: true, force: true });
    }
  });
});

describe("reading the store", () => {
  const override = process.env.EXECUTABLE_STORIES_CYPRESS_STORE;
  const server = 910_000 + (process.pid % 1000);
  const dir = path.join(baseDir(), String(server));
  const entry = { stored: { specRelative: "a.cy.ts", titlePath: ["t"], meta: { scenario: "planted", steps: [] } } };

  afterEach(() => {
    process.env.EXECUTABLE_STORIES_CYPRESS_STORE = override;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("skips a run directory other users can write to", async () => {
    delete process.env.EXECUTABLE_STORIES_CYPRESS_STORE;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(dir, "es-0000000000000000.json"), JSON.stringify(entry));
    fs.chmodSync(dir, 0o777);
    vi.resetModules();
    const store = await import("../store");
    store.loadStore(dir);
    expect(store.getMeta("a.cy.ts", ["t"])).toBeUndefined();
  });

  it("skips a store file that is a symlink", async () => {
    delete process.env.EXECUTABLE_STORIES_CYPRESS_STORE;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const elsewhere = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "es-cypress-planted-")), "story.json");
    fs.writeFileSync(elsewhere, JSON.stringify(entry));
    fs.symlinkSync(elsewhere, path.join(dir, "es-0000000000000000.json"));
    vi.resetModules();
    const store = await import("../store");
    store.loadStore(dir);
    expect(store.getMeta("a.cy.ts", ["t"])).toBeUndefined();
    fs.rmSync(path.dirname(elsewhere), { recursive: true, force: true });
  });
});

describe("finding a Module API run", () => {
  const override = process.env.EXECUTABLE_STORIES_CYPRESS_STORE;
  const spec = "cypress/e2e/login.cy.ts";
  /**
   * Record a story as the plugin of the run whose server is `server`, and return
   * the run's id. The store directory variable stands in for that plugin's parent
   * pid; it is cleared again so lookups go through the temp folder.
   */
  const recordAs = async (server: number, projectRoot: string, scenario: string) => {
    fs.mkdirSync(baseDir(), { recursive: true, mode: 0o700 });
    process.env.EXECUTABLE_STORIES_CYPRESS_STORE = path.join(baseDir(), String(server));
    try {
      vi.resetModules();
      const store = await import("../store");
      const plugin = await import("../plugin");
      const config = plugin.registerExecutableStoriesPlugin(() => {}, { env: {} as Record<string, unknown> });
      store.recordMeta({ specRelative: spec, titlePath: ["t"], meta: { scenario, steps: [] }, projectRoot });
      return config?.env?.executableStoriesRun as string;
    } finally {
      delete process.env.EXECUTABLE_STORIES_CYPRESS_STORE;
    }
  };
  const runA = 920_000 + (process.pid % 1000);
  const runB = runA + 1;
  const resultFor = (env: Record<string, unknown> = {}) => ({
    runs: [{ spec: { relative: spec }, tests: [{ title: ["t"], state: "passed" }] }],
    config: { projectRoot: "/work/app", env },
  });

  afterEach(() => {
    process.env.EXECUTABLE_STORIES_CYPRESS_STORE = override;
    for (const server of [runA, runB]) fs.rmSync(path.join(baseDir(), String(server)), { recursive: true, force: true });
  });

  it("reads exactly the run the result names, when another run of the same specs overlapped", async () => {
    delete process.env.EXECUTABLE_STORIES_CYPRESS_STORE;
    const idA = await recordAs(runA, "/work/app", "run A");
    await recordAs(runB, "/work/app", "run B");
    expect(idA).toBe(path.join(baseDir(), String(runA)));
    vi.resetModules();
    const { buildRawRunFromCypressResult } = await import("../reporter");
    const raw = buildRawRunFromCypressResult(resultFor({ executableStoriesRun: idA }));
    expect(raw.testCases.map((t) => t.story?.scenario)).toEqual(["run A"]);
  });

  it("does not carry one run's stories into the next run's raw run", async () => {
    delete process.env.EXECUTABLE_STORIES_CYPRESS_STORE;
    const idA = await recordAs(runA, "/work/app", "run A");
    // Run B failed before story.init(): its store is an empty directory.
    const idB = path.join(baseDir(), String(runB));
    fs.mkdirSync(idB, { recursive: true, mode: 0o700 });
    vi.resetModules();
    const { buildRawRunFromCypressResult } = await import("../reporter");
    expect(buildRawRunFromCypressResult(resultFor({ executableStoriesRun: idA })).testCases).toHaveLength(1);
    expect(buildRawRunFromCypressResult(resultFor({ executableStoriesRun: idB })).testCases).toEqual([]);
  });

  it("reads nothing, and says why, when overlapping runs leave no run id to go by", async () => {
    delete process.env.EXECUTABLE_STORIES_CYPRESS_STORE;
    await recordAs(runA, "/work/app", "run A");
    await recordAs(runB, "/work/app", "run B");
    vi.resetModules();
    const { buildRawRunFromCypressResult } = await import("../reporter");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const raw = buildRawRunFromCypressResult(resultFor());
    expect(raw.testCases).toEqual([]);
    expect(String(warn.mock.calls[0]?.[0])).toContain("registerExecutableStoriesPlugin(on, config)");
    warn.mockRestore();
  });

  it("reads the one run that matches when there is no run id", async () => {
    delete process.env.EXECUTABLE_STORIES_CYPRESS_STORE;
    await recordAs(runA, "/work/app", "run A");
    await recordAs(runB, "/work/other-checkout", "run B");
    vi.resetModules();
    const { buildRawRunFromCypressResult } = await import("../reporter");
    expect(buildRawRunFromCypressResult(resultFor()).testCases.map((t) => t.story?.scenario)).toEqual(["run A"]);
  });
});

describe("reporter", () => {
  it("prints a failed test's error and step list, and keeps the list out of the raw run", async () => {
    vi.resetModules();
    const { recordMeta } = await import("../store");
    const { default: createReporter } = await import("../reporter");
    recordMeta({
      specRelative: "cypress/e2e/trail.cy.ts",
      titlePath: ["Suite", "it fails"],
      meta: { scenario: "it fails", steps: [{ keyword: "Then", text: "it holds", docs: [] }] },
      failureTrail: trail("  ✗ Then it holds"),
    });

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-cypress-trail-"));
    const suite = { title: "", suites: [] as unknown[], tests: [] as unknown[] };
    const child = { title: "Suite", suites: [], tests: [] as unknown[], parent: suite };
    suite.suites.push(child);
    const err = { message: "expected 1 to equal 2" };
    child.tests.push({ title: "it fails", state: "failed", err, parent: child, fn: () => {} });

    let end: () => void = () => {};
    const runner = { suite, on: (event: string, cb: () => void) => event === "end" && (end = cb) };
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    createReporter(runner as never, {
      reporterOptions: { formats: [], outputDir: dir, rawRunPath: path.join(dir, "raw-run.json") },
    } as never);
    end();
    const printed = write.mock.calls.map((c) => String(c[0])).join("");
    write.mockRestore();

    expect(printed).toContain("1) Suite > it fails");
    expect(printed).toContain("expected 1 to equal 2");
    expect(printed).toContain("✗ Then it holds");
    const raw = JSON.parse(fs.readFileSync(path.join(dir, "raw-run.json"), "utf8"));
    expect(raw.testCases[0].sourceFile).toBe("cypress/e2e/trail.cy.ts");
    expect(raw.testCases[0].error.message).toBe("expected 1 to equal 2");
  });
});
