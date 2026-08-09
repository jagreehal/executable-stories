import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  DEFAULT_LOCKFILE_PATH,
  emptyLockfile,
  hashCaseBody,
  readLockfile,
  setEntry,
  writeLockfile,
} from "../../src/sync/lockfile";
import { makeBody } from "./helpers";

const created: string[] = [];

function tempFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-sync-lock-"));
  created.push(dir);
  return path.join(dir, "sync.lock.json");
}

afterEach(() => {
  for (const dir of created.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("lockfile", () => {
  it("defaults to a path inside the repo so the binding is committed", () => {
    expect(DEFAULT_LOCKFILE_PATH).toBe(".executable-stories/sync.lock.json");
  });

  it("returns an empty lockfile when none exists yet", () => {
    expect(readLockfile(tempFile())).toEqual({ version: 1, providers: {} });
  });

  it("round-trips entries", () => {
    const file = tempFile();
    const lock = emptyLockfile();
    setEntry(lock, "testrail", "fp-1", {
      caseId: "42",
      url: "https://acme.testrail.io/index.php?/cases/view/42",
      hash: "abc123",
      title: "User signs in",
      owned: true,
    });

    writeLockfile(file, lock);

    expect(readLockfile(file)).toEqual(lock);
  });

  it("sorts keys so the pull-request diff stays minimal", () => {
    const file = tempFile();
    const lock = emptyLockfile();
    for (const fingerprint of ["zzz", "aaa", "mmm"]) {
      setEntry(lock, "testrail", fingerprint, {
        caseId: "1",
        url: "u",
        hash: "h",
        title: "t",
        owned: true,
      });
    }

    writeLockfile(file, lock);

    const contents = fs.readFileSync(file, "utf8");
    expect(contents.indexOf('"aaa"')).toBeLessThan(contents.indexOf('"mmm"'));
    expect(contents.indexOf('"mmm"')).toBeLessThan(contents.indexOf('"zzz"'));
  });

  it("refuses a lockfile from a future version rather than guessing", () => {
    const file = tempFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ version: 99, providers: {} }));

    expect(() => readLockfile(file)).toThrow(/version 99/);
  });

  it("explains itself when the file is corrupt", () => {
    const file = tempFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "{ not json");

    expect(() => readLockfile(file)).toThrow(/not valid JSON/);
  });
});

describe("hashCaseBody", () => {
  it("ignores links, because report URLs change every CI run", () => {
    const withoutLinks = hashCaseBody(makeBody());
    const withLinks = hashCaseBody(
      makeBody({ links: [{ label: "Report", url: "https://ci/build/1234" }] }),
    );

    expect(withLinks).toBe(withoutLinks);
  });

  it("changes when a step changes", () => {
    const before = hashCaseBody(makeBody());
    const after = hashCaseBody(makeBody({ steps: [{ keyword: "Given", text: "something else" }] }));

    expect(after).not.toBe(before);
  });

  it("ignores surrounding whitespace a provider may add", () => {
    expect(hashCaseBody(makeBody({ title: "  User signs in  " }))).toBe(
      hashCaseBody(makeBody({ title: "User signs in" })),
    );
  });
});
