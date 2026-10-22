/**
 * Tests for scripts/ref-retry.cjs — retrying an orphan-branch commit that lost a ref race.
 *
 * Run: node --test packages/executable-stories-action/test/
 */

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

const { withRefRetry } = createRequire(import.meta.url)("../scripts/ref-retry.cjs");

const conflict = () => Object.assign(new Error("Update is not a fast forward"), { status: 422 });

describe("withRefRetry", () => {
  it("retries on a lost ref race and returns the winning attempt's result", async () => {
    let calls = 0;
    const retries = [];
    const result = await withRefRetry(
      async () => {
        calls++;
        if (calls < 3) throw conflict();
        return "sha-3";
      },
      { onRetry: (n) => retries.push(n) },
    );
    assert.equal(result, "sha-3");
    assert.deepEqual(retries, [1, 2]);
  });

  it("gives up after the last attempt", async () => {
    let calls = 0;
    await assert.rejects(
      withRefRetry(async () => {
        calls++;
        throw conflict();
      }),
      /fast forward/,
    );
    assert.equal(calls, 3);
  });

  it("does not retry other failures", async () => {
    let calls = 0;
    await assert.rejects(
      withRefRetry(async () => {
        calls++;
        throw Object.assign(new Error("Resource not accessible by integration"), { status: 403 });
      }),
      /not accessible/,
    );
    assert.equal(calls, 1);
  });
});
