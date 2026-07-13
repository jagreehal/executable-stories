/**
 * Explainer contract v1.
 *
 * An "explainer" is a hand-authored (usually agent-generated) document that
 * explains a code change in terms of the scenarios that prove it — see the
 * `explain-change` skill. Its frontmatter carries a machine-readable
 * provenance block tying the document to the scenarios it cites:
 *
 *   explainer:
 *     version: 1
 *     generated: 2026-07-13
 *     runId: run-abc123
 *     commit: 53f921e
 *     scenarios:
 *       - id: user-login-blocked-for-suspended-account
 *         title: Login blocked for suspended user
 *         hash: 9f2c1a0d4e5b6a70
 *
 * The per-scenario `hash` is a digest of the scenario's canonical content
 * (title + step keywords/texts) at generation time. That makes an explainer
 * self-contained: any later run can be checked against it without keeping the
 * original run JSON around. A scenario's *status* (pass/fail) is deliberately
 * NOT part of the hash — staleness is about the described behaviour drifting,
 * not the build flapping.
 *
 * This module is node-only (node:crypto); import it via the
 * `executable-stories-core/explainer` subpath so browser bundles never pull
 * it in.
 */
import { createHash } from "node:crypto";

import type { ReportScenario } from "./types/story-report.js";

/**
 * Shape of a v1 content hash. The single source of truth for every consumer —
 * the explainer-v1 JSON Schema pins its `pattern` to this regex via a sync
 * test, so the strict (Ajv) and light (coercion) validators cannot drift.
 */
export const SCENARIO_HASH_PATTERN = /^[0-9a-f]{16}$/;

/** One scenario citation in an explainer's provenance block. */
export interface ExplainerScenarioRef {
  /** Canonical scenario id — the stable machine key external tools resolve against. */
  id: string;
  /** Scenario title at generation time; enables rename detection when the id changes. */
  title?: string;
  /**
   * Content hash at generation time (see {@link scenarioContentHash}).
   * Mandatory in v1: without it, "fresh" would silently degrade to "the id
   * still exists", which is not the drift detection the contract promises.
   */
  hash: string;
}

/** The `explainer` frontmatter block. */
export interface ExplainerRef {
  version: 1;
  /** ISO date the explainer was generated. */
  generated?: string;
  /** runId of the run the explainer was generated from. */
  runId?: string;
  /** Commit sha the explainer explains. */
  commit?: string;
  branch?: string;
  scenarios: ExplainerScenarioRef[];
}

/**
 * Digest of the scenario content an explainer describes: title plus step
 * keywords and texts, canonically ordered. 16 hex chars of sha256 — plenty for
 * change detection, short enough to hand-check in frontmatter.
 */
export function scenarioContentHash(
  scenario: Pick<ReportScenario, "title"> & {
    steps: ReadonlyArray<{ keyword: string; text: string }>;
  },
): string {
  const canonical = JSON.stringify({
    title: scenario.title,
    steps: scenario.steps.map((step) => ({ keyword: step.keyword, text: step.text })),
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

/**
 * Per-scenario check outcome:
 * - `ok`       — id found, content hash matches
 * - `changed`  — a matching scenario exists (by id, or by title when the id is
 *                gone — compare `ref.id` with `matchedId`) but its content
 *                differs from the hash
 * - `renamed`  — the id is gone but a scenario with the same title and the
 *                same content exists under a new id
 * - `missing`  — no scenario matches by id or title
 */
export type ExplainerScenarioStatus = "ok" | "changed" | "renamed" | "missing";

export interface ExplainerScenarioCheck {
  ref: ExplainerScenarioRef;
  status: ExplainerScenarioStatus;
  /** Current id of the matched scenario (differs from ref.id when the match was by title). */
  matchedId?: string;
  matchedTitle?: string;
  /** Content hash of the matched scenario in the current run. */
  currentHash?: string;
}

export interface ExplainerCheck {
  /** `fresh` only when every cited scenario checks out `ok`. */
  status: "fresh" | "stale";
  scenarios: ExplainerScenarioCheck[];
}

/**
 * Light-weight coercion of parsed frontmatter into an {@link ExplainerRef}.
 * Returns undefined when the value is not an explainer block. Strict schema
 * validation lives in executable-stories-formatters; this is for consumers
 * (e.g. the Astro loader) that receive already-parsed frontmatter.
 */
export function explainerRefFromFrontmatter(value: unknown): ExplainerRef | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const obj = value as Record<string, unknown>;
  if (obj.version !== 1 || !Array.isArray(obj.scenarios)) return undefined;
  const scenarios: ExplainerScenarioRef[] = [];
  for (const entry of obj.scenarios) {
    if (typeof entry !== "object" || entry === null) return undefined;
    const s = entry as Record<string, unknown>;
    if (typeof s.id !== "string" || s.id.length === 0) return undefined;
    // hash is mandatory in v1 — an id-only citation cannot detect drift — and
    // must be well-formed, so this coercion and the JSON Schema agree on what
    // counts as a valid explainer.
    if (typeof s.hash !== "string" || !SCENARIO_HASH_PATTERN.test(s.hash)) return undefined;
    scenarios.push({
      id: s.id,
      title: typeof s.title === "string" ? s.title : undefined,
      hash: s.hash,
    });
  }
  if (scenarios.length === 0) return undefined;
  return {
    version: 1,
    generated: typeof obj.generated === "string" ? obj.generated : undefined,
    runId: typeof obj.runId === "string" ? obj.runId : undefined,
    commit: typeof obj.commit === "string" ? obj.commit : undefined,
    branch: typeof obj.branch === "string" ? obj.branch : undefined,
    scenarios,
  };
}

/** Check every scenario an explainer cites against the current run's scenarios. */
export function checkExplainerRef(
  ref: ExplainerRef,
  currentScenarios: Iterable<ReportScenario>,
): ExplainerCheck {
  const byId = new Map<string, ReportScenario>();
  const byTitle = new Map<string, ReportScenario[]>();
  for (const scenario of currentScenarios) {
    byId.set(scenario.id, scenario);
    const list = byTitle.get(scenario.title) ?? [];
    list.push(scenario);
    byTitle.set(scenario.title, list);
  }

  const scenarios = ref.scenarios.map((scenarioRef) =>
    checkOne(scenarioRef, byId, byTitle),
  );
  const status = scenarios.every((s) => s.status === "ok") ? "fresh" : "stale";
  return { status, scenarios };
}

function checkOne(
  ref: ExplainerScenarioRef,
  byId: Map<string, ReportScenario>,
  byTitle: Map<string, ReportScenario[]>,
): ExplainerScenarioCheck {
  const idMatch = byId.get(ref.id);
  if (idMatch) {
    const currentHash = scenarioContentHash(idMatch);
    return {
      ref,
      status: ref.hash === currentHash ? "ok" : "changed",
      matchedId: idMatch.id,
      matchedTitle: idMatch.title,
      currentHash,
    };
  }

  // Id gone: a same-title scenario under a new id is a rename (content intact)
  // or a change (content drifted too). Ambiguous titles count as a rename of
  // the first candidate — the point is "this still exists, restamp the id".
  const titleMatches = ref.title ? (byTitle.get(ref.title) ?? []) : [];
  const candidate = titleMatches[0];
  if (candidate) {
    const currentHash = scenarioContentHash(candidate);
    return {
      ref,
      status: ref.hash === currentHash ? "renamed" : "changed",
      matchedId: candidate.id,
      matchedTitle: candidate.title,
      currentHash,
    };
  }

  return { ref, status: "missing" };
}
