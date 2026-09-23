import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveAttachment } from "./attachments";

describe("resolveAttachment", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-attach-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("embeds a small file as content, not a reference", () => {
    const file = path.join(dir, "notes.md");
    fs.writeFileSync(file, "# Notes");
    const att = resolveAttachment({ name: "notes.md", mediaType: "text/markdown", path: file });
    expect(att.contentEncoding).toBe("BASE64");
    expect(Buffer.from(att.body, "base64").toString()).toBe("# Notes");
    expect(att.external).toBeUndefined();
  });

  it("keeps inline IDENTITY bodies as content", () => {
    const att = resolveAttachment({
      name: "log.txt",
      mediaType: "text/plain",
      body: "line one",
      encoding: "IDENTITY",
    });
    expect(att.body).toBe("line one");
    expect(att.external).toBeUndefined();
  });

  it("marks a missing file as an external reference to its path", () => {
    const att = resolveAttachment({ name: "gone.txt", mediaType: "text/plain", path: "reports/gone.txt" });
    expect(att).toMatchObject({ body: "reports/gone.txt", contentEncoding: "IDENTITY", external: true });
  });

  it("marks a file over the embed limit as an external reference", () => {
    const file = path.join(dir, "big.log");
    fs.writeFileSync(file, "x".repeat(20));
    const att = resolveAttachment(
      { name: "big.log", mediaType: "text/plain", path: file },
      { maxEmbedBytes: 10, projectRoot: dir },
    );
    expect(att).toMatchObject({ body: "big.log", contentEncoding: "IDENTITY", external: true });
  });

  it("marks a file copied to the external dir as an external reference", () => {
    const file = path.join(dir, "big.log");
    fs.writeFileSync(file, "x".repeat(20));
    const att = resolveAttachment(
      { name: "big.log", mediaType: "text/plain", path: file },
      { maxEmbedBytes: 10, externalDir: path.join(dir, "out") },
    );
    expect(att.external).toBe(true);
    expect(fs.existsSync(att.body)).toBe(true);
  });
});
