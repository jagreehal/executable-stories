import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeArtifactsReadme } from "../src/artifacts-readme";

describe("writeArtifactsReadme", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "artifacts-readme-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("writes an explainer README into the output dir", () => {
    writeArtifactsReadme(dir);
    const content = fs.readFileSync(path.join(dir, "README.md"), "utf8");
    expect(content).toContain("raw-run.json");
    expect(content).toContain("scenario-index");
    expect(content).toContain("executable-stories dev");
  });

  it("never overwrites an existing README (ours or the user's)", () => {
    fs.writeFileSync(path.join(dir, "README.md"), "my notes", "utf8");
    writeArtifactsReadme(dir);
    expect(fs.readFileSync(path.join(dir, "README.md"), "utf8")).toBe("my notes");
  });

  it("creates the output dir when missing and never throws", () => {
    const nested = path.join(dir, "does", "not", "exist");
    expect(() => writeArtifactsReadme(nested)).not.toThrow();
    expect(fs.existsSync(path.join(nested, "README.md"))).toBe(true);
  });
});
