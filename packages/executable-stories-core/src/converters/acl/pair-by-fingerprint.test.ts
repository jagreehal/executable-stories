import { describe, expect, it } from "vitest";

import { pairByFingerprint } from "./pair-by-fingerprint.js";

/** Two sides of a diff, reduced to what the pairing rule needs. */
const item = (id: string, fingerprint: string) => ({ id, fingerprint });
const fp = (i: { fingerprint: string }) => i.fingerprint;

describe("pairByFingerprint", () => {
  it("pairs one removal with the one addition that shares its fingerprint", () => {
    const pairs = pairByFingerprint([item("old", "abc")], [item("new", "abc")], fp);

    expect(pairs).toEqual([{ removed: item("old", "abc"), added: item("new", "abc") }]);
  });

  it("declines an ambiguous match rather than guessing", () => {
    // One removal could be either addition, and nothing says which. Pairing one
    // would make the result depend on the order they happen to arrive in.
    expect(
      pairByFingerprint([item("old", "dup")], [item("a", "dup"), item("b", "dup")], fp),
    ).toEqual([]);
    expect(
      pairByFingerprint([item("a", "dup"), item("b", "dup")], [item("new", "dup")], fp),
    ).toEqual([]);
  });

  it("never pairs on the empty fingerprint", () => {
    // behaviourFingerprint returns "" for a scenario with no steps and no
    // covers, which every planned `it.todo` placeholder shares. Matching on it
    // pairs unrelated placeholders.
    expect(pairByFingerprint([item("old", "")], [item("new", "")], fp)).toEqual([]);
  });

  it("pairs nothing when the fingerprints do not meet", () => {
    expect(pairByFingerprint([item("old", "a")], [item("new", "b")], fp)).toEqual([]);
  });

  it("pairs each distinct fingerprint independently", () => {
    const pairs = pairByFingerprint(
      [item("old-a", "a"), item("old-b", "b")],
      [item("new-b", "b"), item("new-a", "a")],
      fp,
    );

    expect(pairs.map((p) => `${p.removed.id}->${p.added.id}`).sort()).toEqual([
      "old-a->new-a",
      "old-b->new-b",
    ]);
  });

  it("is empty for empty input", () => {
    expect(pairByFingerprint([], [], fp)).toEqual([]);
  });
});
