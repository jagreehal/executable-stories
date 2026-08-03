import { describe, it, expect } from "vitest";

import {
  DEFAULT_URL_STATE,
  decodeUrlState,
  encodeUrlState,
  formatHash,
  splitHash,
} from "../src/lib/hash-state";

describe("hash state", () => {
  it("keeps a bare scenario deep link readable", () => {
    const { anchor, params } = splitHash("#scenario-abc");
    expect(anchor).toBe("scenario-abc");
    expect([...params]).toEqual([]);
  });

  it("separates the deep link from the filters", () => {
    const { anchor, params } = splitHash("#scenario-abc?q=login&tags=smoke");
    expect(anchor).toBe("scenario-abc");
    expect(params.get("q")).toBe("login");
    expect(params.get("tags")).toBe("smoke");
  });

  it("round-trips filter state", () => {
    const state = { query: "login", status: "failed", tags: ["smoke", "wip"], detail: "minimal" } as const;
    expect(decodeUrlState(new URLSearchParams(encodeUrlState(state)))).toEqual(state);
  });

  it("writes nothing for an untouched report", () => {
    expect(encodeUrlState(DEFAULT_URL_STATE)).toBe("");
    expect(formatHash("", "")).toBe("");
  });

  it("ignores a status that is not a real filter", () => {
    expect(decodeUrlState(new URLSearchParams("status=bogus")).status).toBe("all");
  });

  it("survives an empty tags param", () => {
    expect(decodeUrlState(new URLSearchParams("tags=")).tags).toEqual([]);
  });
});
