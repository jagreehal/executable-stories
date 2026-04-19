import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.js";

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
});
