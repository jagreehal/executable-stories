import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { timeAgo, preflightSources } from "./index.js";

describe("timeAgo", () => {
  const now = 10_000_000_000;
  it("formats sub-minute, minute, hour, and day deltas", () => {
    expect(timeAgo(now - 12_000, now)).toBe("12s ago");
    expect(timeAgo(now - 3 * 60_000, now)).toBe("3m ago");
    expect(timeAgo(now - 2 * 3_600_000, now)).toBe("2h ago");
    expect(timeAgo(now - 5 * 86_400_000, now)).toBe("5d ago");
  });
  it("never goes negative for a future timestamp", () => {
    expect(timeAgo(now + 5000, now)).toBe("0s ago");
  });
});

function fakeLogger() {
  const calls: { level: "info" | "warn"; message: string }[] = [];
  return {
    calls,
    info: (message: string) => calls.push({ level: "info", message }),
    warn: (message: string) => calls.push({ level: "warn", message }),
  };
}

describe("preflightSources", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-preflight-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("warns with the path + rawRunPath fix when the run JSON is missing", () => {
    const logger = fakeLogger();
    const missing = path.join(dir, "raw-run.json");
    preflightSources([missing], logger, Date.now());
    expect(logger.calls).toHaveLength(1);
    expect(logger.calls[0]!.level).toBe("warn");
    expect(logger.calls[0]!.message).toContain(missing);
    expect(logger.calls[0]!.message).toContain("rawRunPath");
    // Pre-empts Astro's scary "collection is empty" notice.
    expect(logger.calls[0]!.message).toContain("expected before the first run");
  });

  it("reports a present source as watched, with its freshness", () => {
    const logger = fakeLogger();
    const file = path.join(dir, "raw-run.json");
    fs.writeFileSync(file, "{}");
    preflightSources([file], logger, Date.now());
    expect(logger.calls).toHaveLength(1);
    expect(logger.calls[0]!.level).toBe("info");
    expect(logger.calls[0]!.message).toContain("watching");
    expect(logger.calls[0]!.message).toContain("updated");
  });

  it("warns when only some of several sources exist", () => {
    const logger = fakeLogger();
    const present = path.join(dir, "a.json");
    const missing = path.join(dir, "b.json");
    fs.writeFileSync(present, "{}");
    preflightSources([present, missing], logger, Date.now());
    expect(logger.calls[0]!.level).toBe("warn");
    expect(logger.calls[0]!.message).toContain(missing);
  });
});
