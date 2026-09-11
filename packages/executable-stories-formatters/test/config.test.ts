import { afterEach, describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadConfig,
  resolveConfigDefaults,
  resolveSynthesizeStories,
} from "../src/config.js";

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/config"
);

describe("loadConfig", () => {
  it("returns empty config when config file path does not exist", async () => {
    const config = await loadConfig("/nonexistent/path/executable-stories.config.js");
    expect(config).toEqual({});
  });

  it("loads formatters from a valid config file", async () => {
    const config = await loadConfig(path.join(fixturesDir, "valid.config.js"));
    expect(config.formatters).toBeDefined();
    expect(typeof config.formatters!["test-format"].format).toBe("function");
    expect(config.formatters!["test-format"].name).toBe("test-format");
  });

  it("returns empty config when called with no path and no config file in cwd", async () => {
    // cwd during test run has no executable-stories.config.js
    const config = await loadConfig();
    expect(config).toEqual({});
  });

  it("throws with a clear message when config has no default export", async () => {
    await expect(
      loadConfig(path.join(fixturesDir, "no-default.config.js"))
    ).rejects.toThrow(/must export a default object/);
  });

  it("ignores a docs-site config (same filename, disjoint shape) instead of misreading it", async () => {
    // `executable-stories.config.mjs` is also the init-astro site config
    // (source/sources, never formatters). Running the CLI next to one must
    // not treat it as plugin config.
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "es-site-config-"));
    try {
      const file = path.join(tmpDir, "executable-stories.config.mjs");
      fs.writeFileSync(
        file,
        "export default { source: '../reports/raw-run.json', groupBy: 'feature' };",
      );
      const config = await loadConfig(file);
      expect(config).toEqual({});
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe("JSON config (the non-JS adopter path)", () => {
    let tmpDir: string | undefined;

    afterEach(() => {
      if (tmpDir) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        tmpDir = undefined;
      }
    });

    function writeConfig(contents: string): string {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "es-json-config-"));
      const file = path.join(tmpDir, "executable-stories.config.json");
      fs.writeFileSync(file, contents);
      return file;
    }

    it("loads sync targets from JSON so a Go or Ruby repo needs no JavaScript", async () => {
      const file = writeConfig(
        JSON.stringify({ sync: { testrail: { url: "https://acme.testrail.io", projectId: 7 } } }),
      );
      const config = await loadConfig(file);
      expect(config.sync?.testrail?.projectId).toBe(7);
    });

    it("names the file when the JSON is malformed", async () => {
      const file = writeConfig("{ nope");
      await expect(loadConfig(file)).rejects.toThrow(/is not valid JSON/);
    });

    it("rejects a top-level array rather than reading keys off it", async () => {
      const file = writeConfig("[]");
      await expect(loadConfig(file)).rejects.toThrow(/must contain a JSON object. Got: array/);
    });
  });

  describe("auto-discovery with multiple config files", () => {
    const originalCwd = process.cwd();
    let tmpDir: string | undefined;

    afterEach(() => {
      process.chdir(originalCwd);
      if (tmpDir) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        tmpDir = undefined;
      }
    });

    it("throws (instead of silently shadowing) when both .mjs and .js configs exist", async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "es-config-"));
      fs.writeFileSync(path.join(tmpDir, "executable-stories.config.mjs"), "export default {};");
      fs.writeFileSync(path.join(tmpDir, "executable-stories.config.js"), "export default {};");
      process.chdir(tmpDir);

      await expect(loadConfig()).rejects.toThrow(/Multiple config files found/);
    });

    it("loads the single present config without --config", async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "es-config-"));
      fs.writeFileSync(
        path.join(tmpDir, "executable-stories.config.mjs"),
        "export default { formatters: { solo: { name: 'solo', format: () => '' } } };",
      );
      process.chdir(tmpDir);

      const config = await loadConfig();
      expect(config.formatters?.solo.name).toBe("solo");
    });
  });
});

describe("resolveConfigDefaults", () => {
  const OPTIONS = {
    "html-title": { type: "string" as const },
    "html-architecture": { type: "boolean" as const },
    "html-stale-after-days": { type: "string" as const },
    "webhook-url": { type: "string" as const, multiple: true },
  };

  const resolve = (
    defaults: Record<string, unknown> | undefined,
    typed: string[] = [],
  ) => resolveConfigDefaults({ defaults, options: OPTIONS, typed: new Set(typed) });

  it("stands in for a flag the user did not type", () => {
    const { values, errors } = resolve({ "html-title": "Checkout", "html-architecture": true });
    expect(errors).toEqual([]);
    expect(values).toEqual({ "html-title": "Checkout", "html-architecture": true });
  });

  it("yields to the command line", () => {
    // The whole point of the `typed` set: a config file is a default, not an
    // override, or a CI step could not correct one without editing the repo.
    const { values } = resolve({ "html-title": "Checkout" }, ["html-title"]);
    expect(values).toEqual({});
  });

  it("takes a key written with its dashes, the way --help prints it", () => {
    const { values, errors } = resolve({ "--html-title": "Checkout" });
    expect(errors).toEqual([]);
    expect(values).toEqual({ "html-title": "Checkout" });
  });

  it("reports a key that is not a flag instead of ignoring it", () => {
    const { values, errors } = resolve({ "html-titel": "Checkout" });
    expect(values).toEqual({});
    expect(errors).toEqual(['"html-titel" in the config file\'s defaults is not a CLI option.']);
  });

  it("reports a value of the wrong type", () => {
    const { errors } = resolve({ "html-architecture": "yes", "html-title": true });
    expect(errors).toEqual([
      '"html-architecture" expects true or false, got string.',
      '"html-title" expects a string, got boolean.',
    ]);
  });

  it("takes a number for a string flag, because that is what anyone writes in JSON", () => {
    const { values, errors } = resolve({ "html-stale-after-days": 14 });
    expect(errors).toEqual([]);
    expect(values).toEqual({ "html-stale-after-days": "14" });
  });

  it("takes one value or a list for a repeatable flag", () => {
    expect(resolve({ "webhook-url": "https://a" }).values).toEqual({ "webhook-url": ["https://a"] });
    expect(resolve({ "webhook-url": ["https://a", "https://b"] }).values).toEqual({
      "webhook-url": ["https://a", "https://b"],
    });
  });

  it("refuses the two flags a config file cannot meaningfully set", () => {
    // --config is already resolved by the time this file is read, and --help
    // is not a setting.
    const { errors } = resolve({ config: "other.js", help: true });
    expect(errors).toEqual([
      '"config" cannot be set in the config file\'s defaults.',
      '"help" cannot be set in the config file\'s defaults.',
    ]);
  });

  it("is a no-op for a config with no defaults", () => {
    expect(resolve(undefined)).toEqual({ values: {}, errors: [] });
  });
});

describe("resolveSynthesizeStories", () => {
  const resolve = (
    typed: string[],
    positive?: unknown,
    negative?: unknown,
  ) => resolveSynthesizeStories({ typed, positive, negative });

  it("is on when nobody says otherwise", () => {
    expect(resolve([])).toEqual({ value: true, errors: [] });
  });

  it("takes the setting from the config file under either spelling", () => {
    expect(resolve([], false).value).toBe(false);
    expect(resolve([], true).value).toBe(true);
    expect(resolve([], undefined, true).value).toBe(false);
    expect(resolve([], undefined, false).value).toBe(true);
  });

  it("lets an explicit flag beat the config file, whichever way round", () => {
    expect(resolve(["synthesize-stories"], undefined, true).value).toBe(true);
    expect(resolve(["no-synthesize-stories"], true).value).toBe(false);
  });

  it("gives the last spelling on the command line the final word", () => {
    // `es --no-synthesize-stories` in an alias, corrected at the prompt.
    expect(resolve(["no-synthesize-stories", "synthesize-stories"]).value).toBe(true);
    expect(resolve(["synthesize-stories", "no-synthesize-stories"]).value).toBe(false);
  });

  it("ignores other flags around it", () => {
    expect(resolve(["format", "no-synthesize-stories", "output-dir"]).value).toBe(false);
  });

  it("refuses a config that sets both keys against each other", () => {
    const { errors } = resolve([], true, true); // "synthesize" and "do not synthesize"
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("contradict each other");
  });

  it("accepts both keys when they agree", () => {
    expect(resolve([], true, false)).toEqual({ value: true, errors: [] });
    expect(resolve([], false, true)).toEqual({ value: false, errors: [] });
  });
});
