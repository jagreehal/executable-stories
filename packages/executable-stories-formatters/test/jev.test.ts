import { describe, it, expect, beforeEach } from "vitest";
import { createJevClient, jevFromEnv, type JevAnswer, type JevClient } from "../src/jev";
import { buildTriage, enrichTriage, renderTriage } from "../src/triage";
import { buildGoal, enrichGoal, renderGoal, type GoalArgs } from "../src/goal";
import { buildReview, enrichReview } from "../src/review/build-review";
import { ReviewMarkdownFormatter } from "../src/formatters/review-markdown";
import { stubs } from "./stubs";

/** A client that answers from a table and records what it was asked. */
function stubJev(answers: Record<string, JevAnswer>): JevClient & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    model: "jev-stub",
    calls,
    async ask(state, questions) {
      calls.push({ state, questions: Object.keys(questions) });
      return Object.fromEntries(Object.keys(questions).map((k) => [k, answers[k]!]));
    },
  };
}

const choice = (pick: string, p: number): JevAnswer => ({
  type: "choice",
  choice: pick,
  probabilities: { [pick]: p },
  confidence: p,
});

describe("jev client", () => {
  it("is absent without JEV_API_KEY, so output stays deterministic", () => {
    expect(jevFromEnv({})).toBeUndefined();
    expect(jevFromEnv({ JEV_API_KEY: "k" })?.model).toBe("jev-latest");
  });

  it("posts state + questions with the bearer key and returns answers", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const client = createJevClient({
      apiKey: "secret",
      fetch: async (url, init) => {
        seen = { url: String(url), init: init! };
        return new Response(JSON.stringify({ answers: { q: { type: "noul", noul: 0.9 } } }), { status: 200 });
      },
    });
    const answers = await client.ask("state", { q: { type: "noul", instructions: "?" } });
    expect(answers.q).toEqual({ type: "noul", noul: 0.9 });
    expect(seen!.url).toContain("typesafe.ai");
    expect((seen!.init.headers as Record<string, string>).Authorization).toBe("Bearer secret");
    expect(JSON.parse(seen!.init.body as string)).toMatchObject({ model: "jev-latest", state: "state" });
  });

  it("throws on a non-2xx so the CLI falls back to the deterministic report", async () => {
    const client = createJevClient({ apiKey: "k", fetch: async () => new Response("rate limited", { status: 429 }) });
    await expect(client.ask("s", {})).rejects.toThrow(/Jev 429/);
  });
});

describe("enrichTriage", () => {
  beforeEach(() => stubs.setFakerSeed(3));

  it("suggests a covers path and failure kind only for unrouted failures", async () => {
    const tcs = [
      stubs.testCaseResult({
        id: "routed",
        status: "failed",
        story: stubs.storyMeta({ scenario: "Routed", covers: ["src/cart.ts"] }),
      }),
      stubs.testCaseResult({
        id: "lost",
        status: "failed",
        sourceFile: "lost.test.ts",
        story: stubs.storyMeta({ scenario: "Lost", covers: [] }),
      }),
    ];
    const built = buildTriage({ testCases: tcs, format: "text" });
    const jev = stubJev({ covers: choice("src/cart.ts", 0.8), kind: choice("infra", 0.7) });

    const report = await enrichTriage(built, tcs, jev);

    expect(jev.calls).toHaveLength(1);
    const lost = report.items.find((i) => i.id === "lost")!;
    expect(lost.suggestedCovers).toEqual({ path: "src/cart.ts", probability: 0.8 });
    expect(lost.failureKind).toEqual({ kind: "infra", confidence: 0.7 });
    expect(report.items.find((i) => i.id === "routed")!.suggestedCovers).toBeUndefined();
    expect(report.needsCovers).toBe(1); // a suggestion is not a declaration
    const text = renderTriage(report, "text");
    expect(text).toContain("fix: src/cart.ts? (jev 0.80");
    expect(text).toContain("kind: infra (jev 0.70)");
  });

  it("stays silent below the probability floor", async () => {
    const tcs = [
      stubs.testCaseResult({ id: "a", status: "passed", story: stubs.storyMeta({ covers: ["src/a.ts"] }) }),
      stubs.testCaseResult({ id: "lost", status: "failed", story: stubs.storyMeta({ covers: [] }) }),
    ];
    const report = await enrichTriage(
      buildTriage({ testCases: tcs, format: "text" }),
      tcs,
      stubJev({ covers: choice("src/a.ts", 0.4), kind: choice("nonsense", 0.9) }),
    );
    expect(report.items[0]!.suggestedCovers).toBeUndefined();
    expect(report.items[0]!.failureKind).toBeUndefined();
  });
});

describe("enrichGoal", () => {
  beforeEach(() => stubs.setFakerSeed(5));

  const steps = (...texts: string[]) => texts.map((text) => ({ keyword: "Then" as const, text }));

  function goalArgs(baseSteps: string[], nowSteps: string[]): GoalArgs {
    const base = stubs.testCaseResult({ id: "s", status: "passed", story: stubs.storyMeta({ scenario: "Pays", steps: steps(...baseSteps) }) });
    const now = stubs.testCaseResult({ id: "s", status: "passed", story: stubs.storyMeta({ scenario: "Pays", steps: steps(...nowSteps) }) });
    return {
      run: stubs.testRunResult({ testCases: [now] }),
      baseline: stubs.testRunResult({ testCases: [base] }),
      requireTags: [],
      requireTickets: [],
      requireScenarios: [],
      enforceNoRegressions: false,
      enforceRatchet: true,
      format: "text",
    };
  }

  it("flags a same-length rewrite that checks less, as an advisory that never changes met", async () => {
    const args = goalArgs(["total is 10", "receipt emailed"], ["total is 10", "something happens"]);
    const built = buildGoal(args);
    const report = await enrichGoal(built, args, stubJev({ weakened: { type: "noul", noul: 0.9 } }));

    expect(report.met).toBe(true);
    expect(report.ratchet.violations).toHaveLength(0);
    expect(report.ratchet.advisories).toEqual([
      { id: "s", title: "Pays", kind: "weakened", detail: "jev 0.90: steps rewritten, checks less" },
    ]);
    expect(renderGoal(report, "text")).toContain("advisory weakened: Pays");
  });

  it("does not ask about unchanged scenarios or ones the count ratchet already caught", async () => {
    const same = goalArgs(["a", "b"], ["a", "b"]);
    const shrunk = goalArgs(["a", "b"], ["a"]);
    const jev = stubJev({ weakened: { type: "noul", noul: 0.99 } });
    await enrichGoal(buildGoal(same), same, jev);
    await enrichGoal(buildGoal(shrunk), shrunk, jev);
    expect(jev.calls).toHaveLength(0);
  });
});

describe("enrichReview", () => {
  it("infers change-type for untagged claims that cover changed files, marked as inferred", async () => {
    const run = stubs.testRunResult({
      testCases: [
        stubs.testCaseResult({
          id: "untagged",
          status: "passed",
          sourceFile: "src/cart/checkout.test.ts",
          tags: [],
          story: stubs.storyMeta({ scenario: "Retry no longer double-charges" }),
        }),
        stubs.testCaseResult({
          id: "tagged",
          status: "passed",
          sourceFile: "src/cart/totals.test.ts",
          tags: ["change:feature"],
        }),
      ],
    });
    const patch = ["--- a/src/cart/checkout.ts", "+++ b/src/cart/checkout.ts", "@@ -1,1 +1,2 @@", " const x = 1;", "+if (charged) return;"].join("\n");
    const built = buildReview(run, {
      changedFiles: [
        { path: "src/cart/checkout.ts", changeKind: "modified" },
        { path: "src/cart/totals.ts", changeKind: "modified" },
      ],
      codeDiffs: [{ title: "PR", patch, annotations: [] }],
    });
    const jev = stubJev({ changeType: choice("bugfix", 0.85) });

    const review = await enrichReview(built, jev);

    expect(jev.calls).toHaveLength(1);
    expect((jev.calls[0] as { state: { patch: string } }).state.patch).toContain("+if (charged) return;");
    const untagged = review.claims.find((c) => c.id === "untagged")!;
    expect(untagged.changeType).toBe("bugfix");
    expect(untagged.changeTypeConfidence).toBe(0.85);
    const tagged = review.claims.find((c) => c.id === "tagged")!;
    expect(tagged.changeType).toBe("feature");
    expect(tagged.changeTypeConfidence).toBeUndefined();
    expect(new ReviewMarkdownFormatter().format(review)).toContain("- Change: `bugfix` _(inferred, jev 0.85)_");
  });

  it("leaves unknown in place under the confidence floor", async () => {
    const run = stubs.testRunResult({
      testCases: [stubs.testCaseResult({ id: "u", status: "passed", sourceFile: "src/a.test.ts", tags: [] })],
    });
    const built = buildReview(run, { changedFiles: [{ path: "src/a.ts", changeKind: "modified" }] });
    const review = await enrichReview(built, stubJev({ changeType: choice("perf", 0.3) }));
    expect(review.claims[0]!.changeType).toBe("unknown");
  });
});
