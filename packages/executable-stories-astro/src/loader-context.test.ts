import { describe, it, expect, vi } from "vitest";
import * as path from "node:path";

import { watchAll, type LoaderContext } from "./loader-context.js";

/** A watcher that records subscriptions and lets a test fire a change. */
function fakeCtx() {
  const handlers: ((changed: string) => void)[] = [];
  const added: string[] = [];
  const ctx = {
    watcher: {
      add: (p: string) => added.push(p),
      on: (_event: string, handler: (changed: string) => void) => {
        handlers.push(handler);
      },
    },
  } as unknown as LoaderContext;
  return {
    ctx,
    added,
    fire: (changed: string) => handlers.forEach((h) => h(changed)),
  };
}

describe("watchAll", () => {
  it("resyncs when a watched run file changes", () => {
    const { ctx, fire } = fakeCtx();
    const sync = vi.fn();
    const file = path.resolve("/repo/reports/raw-run.json");

    watchAll(ctx, [file], sync);
    fire(file);

    expect(sync).toHaveBeenCalled();
  });

  it("resyncs when a file inside a watched directory changes", () => {
    // A directory source accumulates one run file per test file, and new ones
    // appear as new test files are written. Watching only the directory path
    // itself would leave the dev server showing yesterday's scenarios.
    const { ctx, fire } = fakeCtx();
    const sync = vi.fn();
    const dir = path.resolve("/repo/reports/.runs");

    watchAll(ctx, [dir], sync);
    fire(path.join(dir, "src%2Falpha.test.ts.json"));

    expect(sync).toHaveBeenCalled();
  });

  it("ignores changes outside everything it watches", () => {
    const { ctx, fire } = fakeCtx();
    const sync = vi.fn();

    watchAll(ctx, [path.resolve("/repo/reports/.runs")], sync);
    fire(path.resolve("/repo/src/unrelated.ts"));

    expect(sync).not.toHaveBeenCalled();
  });
});
