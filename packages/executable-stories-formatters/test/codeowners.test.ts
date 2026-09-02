import { describe, it, expect } from "vitest";
import { ownersFor, parseCodeowners } from "../src/codeowners";

const rules = parseCodeowners(`
# Payments own the checkout path
/src/checkout/    @acme/payments
/src/checkout/legacy/*.ts  @acme/legacy-crew
*.md              @acme/docs
/src/search/**    @acme/search @alice
`);

describe("parseCodeowners", () => {
  it("skips comments and blank lines", () => {
    expect(rules).toHaveLength(4);
  });

  it("keeps every owner on a rule", () => {
    expect(rules[3]!.owners).toEqual(["@acme/search", "@alice"]);
  });
});

describe("ownersFor", () => {
  it("matches a directory rule against a file inside it", () => {
    expect(ownersFor(rules, "src/checkout/cart.ts")).toEqual(["@acme/payments"]);
  });

  it("lets the last matching rule win, as git does", () => {
    expect(ownersFor(rules, "src/checkout/legacy/old.ts")).toEqual(["@acme/legacy-crew"]);
  });

  it("matches an extension rule anywhere in the tree", () => {
    expect(ownersFor(rules, "docs/guides/setup.md")).toEqual(["@acme/docs"]);
  });

  it("matches a double-star rule at any depth", () => {
    expect(ownersFor(rules, "src/search/ranking/score.ts")).toEqual(["@acme/search", "@alice"]);
  });

  it("returns no owner for an unclaimed path rather than guessing", () => {
    expect(ownersFor(rules, "src/misc/thing.ts")).toEqual([]);
  });

  it("ignores a leading ./ so run-relative paths still match", () => {
    expect(ownersFor(rules, "./src/checkout/cart.ts")).toEqual(["@acme/payments"]);
  });
});
