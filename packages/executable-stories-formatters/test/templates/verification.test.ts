/**
 * Tests for the verified-by resolver shipped in the Astro Starlight template
 * (templates/astro-starlight/src/lib/verification.ts). This is the core of the
 * living-documentation badge, so its status semantics are pinned here.
 */

import { describe, it, expect } from "vitest";
import {
  resolveVerification,
  flattenReport,
  findScenarioById,
  hasScenarioId,
  isVerificationStale,
  presentStatus,
  verificationAgeDays,
  type StoryReportLike,
} from "../../templates/astro-starlight/src/lib/verification";

function report(scenarios: Array<Partial<{ id: string; title: string; status: string; tags: string[]; tickets: Array<{ id: string }> }>>): StoryReportLike {
  return {
    runId: "run-123",
    finishedAtMs: 1_700_000_000_000,
    features: [
      {
        title: "Checkout",
        sourceFile: "checkout.story.ts",
        scenarios: scenarios.map((s, i) => ({
          id: s.id ?? `checkout--scenario-${i}`,
          title: s.title ?? `Scenario ${i}`,
          status: (s.status as never) ?? "passed",
          tags: s.tags,
          tickets: s.tickets,
        })),
      },
    ],
  };
}

describe("resolveVerification", () => {
  it("returns verified when all matched stories passed", () => {
    const r = resolveVerification("checkout--scenario-0", report([{ status: "passed" }]));
    expect(r.status).toBe("verified");
    expect(r.total).toBe(1);
    expect(r.passed).toBe(1);
    expect(r.lastVerifiedMs).toBe(1_700_000_000_000);
    expect(r.runId).toBe("run-123");
  });

  it("returns failing when any matched story failed", () => {
    const r = resolveVerification(
      "pricing",
      report([
        { tags: ["pricing"], status: "passed" },
        { tags: ["pricing"], status: "failed" },
      ]),
    );
    expect(r.status).toBe("failing");
    expect(r.failed).toBe(1);
    expect(r.total).toBe(2);
  });

  it("returns not-run when matched stories were skipped or pending", () => {
    const r = resolveVerification(
      "checkout--scenario-0",
      report([{ status: "skipped" }]),
    );
    expect(r.status).toBe("not-run");
    expect(r.notRun).toBe(1);
  });

  it("returns unverified when no story matches and reports the missing ref", () => {
    const r = resolveVerification("does-not-exist", report([{ status: "passed" }]));
    expect(r.status).toBe("unverified");
    expect(r.total).toBe(0);
    expect(r.missingRefs).toEqual(["does-not-exist"]);
  });

  it("matches by tag, ticket id, exact id, and exact title", () => {
    const rep = report([
      { id: "a", title: "Alpha", tags: ["auth"], tickets: [{ id: "PAY-1" }] },
    ]);
    expect(resolveVerification("a", rep).total).toBe(1); // id
    expect(resolveVerification("Alpha", rep).total).toBe(1); // title
    expect(resolveVerification("auth", rep).total).toBe(1); // tag
    expect(resolveVerification("PAY-1", rep).total).toBe(1); // ticket
  });

  it("de-duplicates a scenario matched by multiple refs", () => {
    const rep = report([{ id: "a", tags: ["auth"] }]);
    const r = resolveVerification(["a", "auth"], rep);
    expect(r.total).toBe(1);
    expect(r.refs).toHaveLength(2);
    expect(r.refs.every((ref) => ref.matched.length === 1)).toBe(true);
  });

  it("aggregates across multiple refs, downgrading to failing on any failure", () => {
    const rep = report([
      { id: "a", status: "passed" },
      { id: "b", status: "failed" },
    ]);
    expect(resolveVerification(["a", "b"], rep).status).toBe("failing");
  });

  it("trims, drops empty, and de-duplicates references", () => {
    const rep = report([{ id: "a" }]);
    const r = resolveVerification([" a ", "a", ""], rep);
    expect(r.refs).toHaveLength(1);
    expect(r.refs[0].ref).toBe("a");
  });

  it("treats an empty report as unverified with no timestamp", () => {
    const r = resolveVerification("anything", { runId: "", finishedAtMs: 0, features: [] });
    expect(r.status).toBe("unverified");
    expect(r.lastVerifiedMs).toBeUndefined();
    expect(r.runId).toBeUndefined();
  });

  it("treats an empty verifiedBy list as explicitly unverified", () => {
    const r = resolveVerification([], report([{ id: "a" }]));
    expect(r.status).toBe("unverified");
    expect(r.total).toBe(0);
    expect(r.missingRefs).toEqual([]);
  });

  it("flattenReport carries feature context onto scenarios", () => {
    const flat = flattenReport(report([{ id: "a" }]));
    expect(flat[0].feature).toBe("Checkout");
    expect(flat[0].sourceFile).toBe("checkout.story.ts");
  });

  it("finds scenarios by id for scenario-note staleness checks", () => {
    const rep = report([{ id: "a" }]);
    expect(findScenarioById(rep, "a")?.title).toBe("Scenario 0");
    expect(hasScenarioId(rep, "a")).toBe(true);
    expect(hasScenarioId(rep, "ghost")).toBe(false);
  });
});

describe("presentStatus", () => {
  it("describes a verified badge", () => {
    const p = presentStatus(resolveVerification("a", report([{ id: "a" }])));
    expect(p.label).toBe("Verified");
    expect(p.summary).toContain("passing story");
  });

  it("names the missing refs in an unverified badge", () => {
    const p = presentStatus(resolveVerification("ghost", report([{ id: "a" }])));
    expect(p.label).toBe("Unverified");
    expect(p.summary).toContain("ghost");
  });

  it("computes verification age and stale thresholds", () => {
    const result = resolveVerification("a", report([{ id: "a" }]));
    expect(verificationAgeDays(result, 1_700_000_000_000 + 15 * 86_400_000)).toBe(15);
    expect(isVerificationStale(result, 14, 1_700_000_000_000 + 15 * 86_400_000)).toBe(true);
    expect(isVerificationStale(result, 30, 1_700_000_000_000 + 15 * 86_400_000)).toBe(false);
  });
});
