import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { extractLinks, classifyLink, checkLinks } from "../src/check-links";

describe("extractLinks", () => {
  it("pulls markdown links, images, and html href/src", () => {
    const md = `[a](./a.md) ![img](./b.png) <a href="./c.mdx">c</a> <img src="/d.png">`;
    expect(extractLinks(md)).toEqual(["./a.md", "./b.png", "./c.mdx", "/d.png"]);
  });

  it("ignores links inside code blocks", () => {
    const md = "```\n[x](./should-not-count.md)\n```\nreal [y](./y.md)";
    expect(extractLinks(md)).toEqual(["./y.md"]);
  });
});

describe("classifyLink", () => {
  it("classifies by shape", () => {
    expect(classifyLink("https://x.com")).toBe("external");
    expect(classifyLink("//x.com")).toBe("external");
    expect(classifyLink("mailto:a@b.com")).toBe("mail");
    expect(classifyLink("#section")).toBe("anchor");
    expect(classifyLink("/root")).toBe("root");
    expect(classifyLink("./rel.md")).toBe("internal");
  });
});

describe("checkLinks", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-links-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("flags broken relative links and passes valid ones", async () => {
    fs.writeFileSync(path.join(dir, "target.md"), "# Target");
    fs.writeFileSync(
      path.join(dir, "index.md"),
      "[ok](./target.md)\n[ext-no-ext](./target)\n[broken](./missing.md)\n[ext](https://example.com)\n",
    );
    const report = await checkLinks({ target: dir });
    expect(report.filesScanned).toBe(2);
    expect(report.brokenCount).toBe(1);
    expect(report.broken[0].link).toBe("./missing.md");
    // external is skipped when checkExternal is false
    expect(report.skipped).toBe(1);
  });

  it("resolves extensionless links and directory index files", async () => {
    fs.mkdirSync(path.join(dir, "guide"));
    fs.writeFileSync(path.join(dir, "guide", "index.mdx"), "# Guide");
    fs.writeFileSync(path.join(dir, "page.md"), "[dir](./guide)\n");
    const report = await checkLinks({ target: dir });
    expect(report.brokenCount).toBe(0);
  });

  it("reports zero broken for a clean tree", async () => {
    fs.writeFileSync(path.join(dir, "a.md"), "[self](#top)\njust text");
    const report = await checkLinks({ target: dir });
    expect(report.brokenCount).toBe(0);
  });
});
