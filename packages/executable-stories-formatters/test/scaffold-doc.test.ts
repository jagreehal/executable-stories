import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { scaffoldDoc, slugify, isTemplateName, TEMPLATES } from "../src/scaffold-doc";

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-scaffold-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const FIXED = new Date("2026-01-15T00:00:00Z");

describe("slugify", () => {
  it("kebab-cases and strips punctuation", () => {
    expect(slugify("Cap discount at 30%!")).toBe("cap-discount-at-30");
    expect(slugify("  Hello, World  ")).toBe("hello-world");
    expect(slugify("")).toBe("untitled");
  });
});

describe("isTemplateName", () => {
  it("recognises known templates and rejects others", () => {
    for (const t of TEMPLATES) expect(isTemplateName(t)).toBe(true);
    expect(isTemplateName("nope")).toBe(false);
  });
});

describe("scaffoldDoc", () => {
  it("creates an ADR with verifiedBy frontmatter and a sequence number", () => {
    const r = scaffoldDoc({ template: "adr", name: "Cap discount", baseDir: dir, today: FIXED });
    expect(r.path).toContain(path.join("adr", "0001-cap-discount.mdx"));
    const content = fs.readFileSync(r.path, "utf8");
    expect(content).toContain("title: 'ADR 0001 — Cap discount'");
    expect(content).toContain("verifiedBy: []");
    expect(content).toContain("## Decision");
  });

  it("increments the ADR sequence number", () => {
    scaffoldDoc({ template: "adr", name: "First", baseDir: dir, today: FIXED });
    const second = scaffoldDoc({ template: "adr", name: "Second", baseDir: dir, today: FIXED });
    expect(second.path).toContain("0002-second.mdx");
  });

  it("creates a runbook that uses verified checklist components", () => {
    const r = scaffoldDoc({ template: "runbook", name: "Restart svc", baseDir: dir, today: FIXED });
    const content = fs.readFileSync(r.path, "utf8");
    expect(content).toContain("import Checklist from");
    expect(content).toContain("<VerifiedStep");
  });

  it("dates the incident filename", () => {
    const r = scaffoldDoc({ template: "incident", name: "Outage", baseDir: dir, today: FIXED });
    expect(r.path).toContain(path.join("incidents", "2026-01-15-outage.mdx"));
  });

  it("refuses to overwrite without force", () => {
    scaffoldDoc({ template: "decision-log", name: "Log", baseDir: dir, today: FIXED });
    expect(() => scaffoldDoc({ template: "decision-log", name: "Log", baseDir: dir, today: FIXED })).toThrow(
      /already exists/,
    );
    expect(() =>
      scaffoldDoc({ template: "decision-log", name: "Log", baseDir: dir, today: FIXED, force: true }),
    ).not.toThrow();
  });

  it("rejects unknown templates", () => {
    expect(() => scaffoldDoc({ template: "wiki", baseDir: dir })).toThrow(/Unknown template/);
  });
});
