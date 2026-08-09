/**
 * Provider-agnostic sync engine.
 *
 * Everything that is not a vendor API call lives here: projecting stories into
 * case bodies, binding them to remote cases, classifying what the provider
 * holds, building the plan, and applying it. Adapters stay thin.
 *
 * Two phases, deliberately separate so `--dry-run` and a real run share one code
 * path: {@link analyzeSync} reads and decides, {@link applySync} writes.
 *
 * fn(args, deps) throughout.
 */

import { behaviourFingerprint, behaviourSimilarity } from "executable-stories-core/converters/acl/ids";
import type { TestCaseResult, TestRunResult, Attachment } from "executable-stories-core/types/test-result";
import type { DocEntry } from "executable-stories-core/types/story";

import type {
  CaseBody,
  CaseResult,
  RemoteCase,
  ResultAttachment,
  SyncProvider,
} from "./port";
import {
  entriesFor,
  hashCaseBody,
  setEntry,
  type Lockfile,
  type LockEntry,
} from "./lockfile";

/** Which executions get their evidence uploaded. */
export type AttachPolicy = "failed" | "all" | "none";

export interface SyncEngineConfig {
  /**
   * Ticket-id prefix that marks a `story.tickets` entry as this provider's case
   * id (TestRail's "C1234"). Without it, only the lockfile binds.
   */
  ticketPrefix?: string;
  /**
   * Whether the prefix is decoration to strip ("C1234" -> "1234", TestRail) or
   * part of the id itself ("PROJ-42" stays whole, Xray/Jira). Default true.
   */
  ticketPrefixStrip?: boolean;
  /** Base URL of the published HTML report, used for links back from cases. */
  reportUrl?: string;
  /**
   * Turns a scenario into the fragment appended to `reportUrl`, for a link that
   * lands on the scenario rather than the top of the page.
   *
   * Caller-supplied for the same reason the markdown formatter's option is
   * (`types/options.ts`): the correct slug depends on how the docs site routes,
   * and guessing it produces links that 404. Without it, cases link to the
   * report page itself.
   */
  scenarioAnchor?: (tc: TestCaseResult) => string | undefined;
  /** Default "failed": nobody watches a passing test's video, and quotas are real. */
  attach?: AttachPolicy;
  /** Similarity at or above which an unlinked case is flagged as a possible duplicate. */
  duplicateThreshold?: number;
}

/** A story, ready to be a case. */
export interface LocalBehaviour {
  fingerprint: string;
  testCase: TestCaseResult;
  body: CaseBody;
}

export type CoverageClass = "automated" | "duplicated" | "possible-duplicate" | "manual-only";

export interface ClassifiedCase {
  case: RemoteCase;
  classification: CoverageClass;
  /** Scenario title this case resembles or duplicates, when one was found. */
  resembles?: string;
  /** 0..1, present for "possible-duplicate". */
  similarity?: number;
}

export interface PlanCreate {
  fingerprint: string;
  scenario: string;
  body: CaseBody;
}

export interface PlanUpdate {
  fingerprint: string;
  caseId: string;
  url: string;
  scenario: string;
  body: CaseBody;
}

export interface PlanSkip {
  fingerprint: string;
  caseId: string;
  url: string;
  title: string;
  reason: "remote-edited" | "case-missing";
}

export interface PlanOrphan {
  fingerprint: string;
  caseId: string;
  url: string;
  title: string;
}

export interface AttachmentSummary {
  files: number;
  bytes: number;
  oversized: Array<{ filename: string; bytes: number; limit: number }>;
  byRole: Record<string, number>;
}

export interface SyncAnalysis {
  provider: string;
  target?: string;
  local: LocalBehaviour[];
  remote: ClassifiedCase[];
  create: PlanCreate[];
  update: PlanUpdate[];
  unchanged: PlanUpdate[];
  /** Human-authored cases bound via `story.tickets`. Executions only, body untouched. */
  adopted: PlanUpdate[];
  skipped: PlanSkip[];
  orphaned: PlanOrphan[];
  /** Results for behaviours already bound. Newly created cases add theirs at apply time. */
  results: CaseResult[];
  attachments: AttachmentSummary;
  /** Capabilities this provider lacks that the plan would otherwise use. */
  unsupported: string[];
  /**
   * Bound cases the provider would not hand back a body for, so a human edit to
   * them cannot be detected. Reported rather than assumed safe.
   */
  driftUncheckable: number;
  /** Set when the orphan count suggests the run was filtered rather than complete. */
  partialRunWarning?: string;
}

export interface SyncApplyResult {
  created: Array<{ scenario: string; caseId: string; url: string }>;
  updated: Array<{ scenario: string; caseId: string; url: string }>;
  resultsRecorded: number;
  resultsSkipped: Array<{ caseId: string; reason: string }>;
  attachmentsUploaded: number;
  runUrl?: string;
  errors: string[];
}

/**
 * `behaviourSimilarity` weights steps at 0.7 and the title at 0.3, so two cases
 * with byte-identical steps and unrelated titles score exactly 0.7. That is the
 * floor worth surfacing: identical steps is the strongest duplicate signal there
 * is, and a stricter default hid it behind a reworded title.
 *
 * Sensitivity is the right bias here because this label never binds anything. A
 * false flag costs a reviewer a few seconds; a missed one leaves a manual case
 * nobody ever retires, which is the cost this whole report exists to remove.
 */
const DEFAULT_DUPLICATE_THRESHOLD = 0.7;
/** Above this share of bindings orphaning at once, assume a filtered run, not deletions. */
const PARTIAL_RUN_ORPHAN_RATIO = 0.25;

// --- projection -------------------------------------------------------------

function normalizeTitle(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Render doc entries to markdown-ish plain text. Adapters convert to their own markup. */
export function renderDocs(docs: readonly DocEntry[] | undefined, depth = 0): string {
  if (!docs || docs.length === 0) return "";
  const lines: string[] = [];

  for (const doc of docs) {
    switch (doc.kind) {
      case "note":
        lines.push(doc.text);
        break;
      case "kv":
        lines.push(`**${doc.label}:** ${formatValue(doc.value)}`);
        break;
      case "state":
        lines.push(`**${doc.label ?? "State"}:** ${formatValue(doc.value)}`);
        break;
      case "code":
        lines.push(`**${doc.label}**`, "", "```" + (doc.lang ?? ""), doc.content, "```");
        break;
      case "table":
        lines.push(
          `**${doc.label}**`,
          "",
          `| ${doc.columns.join(" | ")} |`,
          `| ${doc.columns.map(() => "---").join(" | ")} |`,
          ...doc.rows.map((row) => `| ${row.join(" | ")} |`),
        );
        break;
      case "link":
        lines.push(`[${doc.label}](${doc.url})`);
        break;
      case "section":
        lines.push(`${"#".repeat(Math.min(6, depth + 3))} ${doc.title}`, "", doc.markdown);
        break;
      case "mermaid":
        lines.push(...(doc.title ? [`**${doc.title}**`, ""] : []), "```mermaid", doc.code, "```");
        break;
      case "screenshot":
        lines.push(`_Screenshot: ${doc.alt ?? doc.path}_`);
        break;
      case "video":
        lines.push(`_Video: ${doc.caption ?? doc.path}_`);
        break;
      case "html":
        lines.push(`_Embedded: ${doc.title ?? doc.url ?? doc.path ?? "html"}_`);
        break;
      case "custom":
        lines.push(`_${doc.type}_: ${formatValue(doc.data)}`);
        break;
      case "tag":
        // Tags reach the case through their own field, not the description.
        break;
    }

    const children = renderDocs(doc.children, depth + 1);
    if (children) lines.push(children);
  }

  return lines.join("\n");
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/** Link into the published report, deep-linked when an anchor function is supplied. */
function scenarioUrl(config: SyncEngineConfig, tc: TestCaseResult): string | undefined {
  if (!config.reportUrl) return undefined;
  const base = config.reportUrl.replace(/\/$/, "");
  const anchor = config.scenarioAnchor?.(tc);
  return anchor ? `${base}#${anchor}` : base;
}

/** Project one canonical test case into provider-neutral case content. */
export function toCaseBody(tc: TestCaseResult, config: SyncEngineConfig): CaseBody {
  const sections: string[] = [];

  const docs = renderDocs(tc.story.docs);
  if (docs) sections.push(docs);

  const tickets = tc.story.tickets ?? [];
  if (tickets.length > 0) {
    sections.push(
      `**Requirements:** ${tickets.map((t) => (t.url ? `[${t.id}](${t.url})` : t.id)).join(", ")}`,
    );
  }
  if (tc.story.covers?.length) {
    sections.push(`**Covers:** ${tc.story.covers.join(", ")}`);
  }
  sections.push(`_Generated from ${tc.sourceFile}:${tc.sourceLine} by executable-stories. Edit the test, not this case._`);

  const links: Array<{ label: string; url: string }> = [];
  const report = scenarioUrl(config, tc);
  if (report) links.push({ label: "Living documentation", url: report });
  for (const ticket of tickets) {
    if (ticket.url) links.push({ label: ticket.id, url: ticket.url });
  }

  return {
    title: tc.story.scenario,
    steps: tc.story.steps.map((s) => ({ keyword: s.keyword, text: s.text })),
    description: sections.join("\n\n"),
    links,
  };
}

/**
 * Project a run into fingerprinted behaviours.
 *
 * `behaviourFingerprint` returns "" for a scenario with no steps and no
 * `covers`, and two scenarios with identical steps collide. Both fall back to
 * the canonical test-case id, which is unique within a run — less
 * rename-resilient, but a stable binding beats a shared one.
 */
export function projectBehaviours(
  run: TestRunResult,
  config: SyncEngineConfig,
): LocalBehaviour[] {
  const fingerprints = run.testCases.map((tc) =>
    behaviourFingerprint({
      scenario: tc.story.scenario,
      sourceFile: tc.sourceFile,
      steps: tc.story.steps.map((s) => ({ keyword: s.keyword, text: s.text })),
      covers: tc.story.covers,
    }),
  );

  const counts = new Map<string, number>();
  for (const fp of fingerprints) {
    if (fp) counts.set(fp, (counts.get(fp) ?? 0) + 1);
  }

  return run.testCases.map((tc, index) => {
    const fp = fingerprints[index]!;
    const unique = fp !== "" && counts.get(fp) === 1;
    return {
      fingerprint: unique ? fp : tc.id,
      testCase: tc,
      body: toCaseBody(tc, config),
    };
  });
}

// --- attachments ------------------------------------------------------------

function roleFor(attachment: Attachment): ResultAttachment["role"] {
  const type = attachment.mediaType.toLowerCase();
  if (type.startsWith("image/")) return "screenshot";
  if (type.startsWith("video/")) return "video";
  if (attachment.name.toLowerCase().includes("trace")) return "trace";
  return "log";
}

function decode(attachment: Attachment): Uint8Array {
  return attachment.contentEncoding === "BASE64"
    ? Uint8Array.from(Buffer.from(attachment.body, "base64"))
    : new TextEncoder().encode(attachment.body);
}

/** Attachments for one test, filtered by policy and the provider's size limit. */
export function collectAttachments(
  args: { testCase: TestCaseResult; policy: AttachPolicy; maxBytes?: number },
): { attachments: ResultAttachment[]; oversized: Array<{ filename: string; bytes: number; limit: number }> } {
  const { testCase, policy, maxBytes } = args;
  if (policy === "none") return { attachments: [], oversized: [] };
  if (policy === "failed" && testCase.status !== "failed") return { attachments: [], oversized: [] };

  const attachments: ResultAttachment[] = [];
  const oversized: Array<{ filename: string; bytes: number; limit: number }> = [];

  for (const raw of testCase.attachments) {
    const body = decode(raw);
    if (maxBytes !== undefined && body.byteLength > maxBytes) {
      oversized.push({ filename: raw.name, bytes: body.byteLength, limit: maxBytes });
      continue;
    }
    attachments.push({
      filename: raw.name,
      mediaType: raw.mediaType,
      body,
      role: roleFor(raw),
    });
  }

  return { attachments, oversized };
}

function toCaseResult(
  args: { behaviour: LocalBehaviour; caseId: string; provider: SyncProvider; config: SyncEngineConfig },
): { result: CaseResult; oversized: Array<{ filename: string; bytes: number; limit: number }> } | undefined {
  const { behaviour, caseId, provider, config } = args;
  const tc = behaviour.testCase;
  // "pending" is a planned scenario (it.todo) — no execution happened, so there
  // is nothing to record. Reporting it as skipped would misrepresent a spec as a
  // test that ran and was ignored.
  if (tc.status === "pending") return undefined;

  const { attachments, oversized } = collectAttachments({
    testCase: tc,
    policy: config.attach ?? "failed",
    maxBytes: provider.maxAttachmentBytes,
  });

  return {
    result: {
      caseId,
      status: tc.status,
      durationMs: tc.durationMs,
      message: tc.errorMessage,
      url: scenarioUrl(config, tc),
      attachments: attachments.length > 0 ? attachments : undefined,
    },
    oversized,
  };
}

// --- binding and classification ---------------------------------------------

/** Case id carried on the story itself, e.g. `story.tickets` holding "C1234". */
function ticketBinding(tc: TestCaseResult, config: SyncEngineConfig): string | undefined {
  const prefix = config.ticketPrefix;
  if (!prefix) return undefined;
  const match = (tc.story.tickets ?? []).find((t) => t.id.startsWith(prefix));
  if (!match) return undefined;
  return config.ticketPrefixStrip === false ? match.id : match.id.slice(prefix.length);
}

// --- analysis ---------------------------------------------------------------

export interface AnalyzeSyncArgs {
  run: TestRunResult;
  provider: SyncProvider;
  lockfile: Lockfile;
  config: SyncEngineConfig;
}

export async function analyzeSync(args: AnalyzeSyncArgs): Promise<SyncAnalysis> {
  const { run, provider, lockfile, config } = args;

  const local = projectBehaviours(run, config);
  const remoteCases = await provider.listCases();
  const remoteById = new Map(remoteCases.map((c) => [c.id, c]));
  const locked = entriesFor(lockfile, provider.name);

  const create: PlanCreate[] = [];
  const update: PlanUpdate[] = [];
  const unchanged: PlanUpdate[] = [];
  const adopted: PlanUpdate[] = [];
  const skipped: PlanSkip[] = [];
  const results: CaseResult[] = [];
  const oversized: AttachmentSummary["oversized"] = [];
  const boundCaseIds = new Set<string>();
  let driftUncheckable = 0;

  for (const behaviour of local) {
    const entry = locked[behaviour.fingerprint];
    const caseId = entry?.caseId ?? ticketBinding(behaviour.testCase, config);
    const remote = caseId ? remoteById.get(caseId) : undefined;

    if (!caseId) {
      create.push({
        fingerprint: behaviour.fingerprint,
        scenario: behaviour.body.title,
        body: behaviour.body,
      });
      continue;
    }

    if (!remote) {
      // Bound to a case that is gone. Never silently re-create: someone deleted
      // it on purpose, or the config points at the wrong project.
      skipped.push({
        fingerprint: behaviour.fingerprint,
        caseId,
        url: entry?.url ?? "",
        title: entry?.title ?? behaviour.body.title,
        reason: "case-missing",
      });
      continue;
    }

    boundCaseIds.add(caseId);

    const pending = toCaseResult({ behaviour, caseId, provider, config });
    if (pending) {
      results.push(pending.result);
      oversized.push(...pending.oversized);
    }

    const planned: PlanUpdate = {
      fingerprint: behaviour.fingerprint,
      caseId,
      url: remote.url,
      scenario: behaviour.body.title,
      body: behaviour.body,
    };

    // Reached through a story ticket rather than a case we created: a human owns
    // this body. Record the binding, push executions against it, leave the
    // content alone.
    if (!entry?.owned) {
      adopted.push(planned);
      continue;
    }

    // Drift guard: compare the provider's current copy against the hash of what
    // it held right after our last write. Different means a human edited it.
    const remoteHash = remote.body ? hashCaseBody(remote.body) : undefined;
    if (remoteHash !== undefined && remoteHash !== entry.hash) {
      skipped.push({
        fingerprint: behaviour.fingerprint,
        caseId,
        url: remote.url,
        title: remote.title,
        reason: "remote-edited",
      });
      continue;
    }

    // A provider that cannot hand back a case body leaves nothing to compare
    // against, so fall back to the stored hash: equal means nothing has changed
    // on our side since the last write either, and re-sending an identical body
    // every run would bury the real changes in a plan nobody reads. It cannot
    // detect a human edit — only the provider's own copy can do that — so the
    // plan says so rather than implying a guarantee it is not making.
    const baseline = remoteHash ?? entry.hash;
    if (baseline !== "" && hashCaseBody(behaviour.body) === baseline) {
      unchanged.push(planned);
    } else {
      update.push(planned);
    }
    if (remoteHash === undefined) driftUncheckable += 1;
  }

  // Classify everything the provider holds that no story claims.
  const byNormalizedTitle = new Map<string, LocalBehaviour>();
  for (const behaviour of local) byNormalizedTitle.set(normalizeTitle(behaviour.body.title), behaviour);
  const threshold = config.duplicateThreshold ?? DEFAULT_DUPLICATE_THRESHOLD;

  const remote: ClassifiedCase[] = remoteCases.map((remoteCase) => {
    if (boundCaseIds.has(remoteCase.id)) {
      return { case: remoteCase, classification: "automated" as const };
    }

    const titleMatch = byNormalizedTitle.get(normalizeTitle(remoteCase.title));
    if (titleMatch) {
      return {
        case: remoteCase,
        classification: "duplicated" as const,
        resembles: titleMatch.body.title,
      };
    }

    // Similarity only ever labels. It never binds: auto-linking on a guess is
    // how these tools corrupt someone's instance.
    if (remoteCase.body && remoteCase.body.steps.length > 0) {
      let best: { behaviour: LocalBehaviour; score: number } | undefined;
      for (const behaviour of local) {
        const score = behaviourSimilarity(
          {
            scenario: remoteCase.title,
            sourceFile: "",
            steps: remoteCase.body.steps,
          },
          {
            scenario: behaviour.body.title,
            sourceFile: behaviour.testCase.sourceFile,
            steps: behaviour.body.steps,
          },
        );
        if (!best || score > best.score) best = { behaviour, score };
      }
      if (best && best.score >= threshold) {
        return {
          case: remoteCase,
          classification: "possible-duplicate" as const,
          resembles: best.behaviour.body.title,
          similarity: Number(best.score.toFixed(2)),
        };
      }
    }

    return { case: remoteCase, classification: "manual-only" as const };
  });

  // Orphans: bindings whose behaviour no longer exists in the codebase.
  const localFingerprints = new Set(local.map((b) => b.fingerprint));
  const orphaned: PlanOrphan[] = Object.entries(locked)
    .filter(([fingerprint]) => !localFingerprints.has(fingerprint))
    .map(([fingerprint, entry]) => ({
      fingerprint,
      caseId: entry.caseId,
      url: entry.url,
      title: entry.title,
    }));

  const lockedCount = Object.keys(locked).length;
  const partialRunWarning =
    lockedCount > 0 && orphaned.length / lockedCount > PARTIAL_RUN_ORPHAN_RATIO
      ? `${orphaned.length} of ${lockedCount} bindings have no matching story. If this run was filtered (a -t/--grep flag, a single file), those are not deletions. Nothing is removed either way.`
      : undefined;

  const unsupported: string[] = [];
  if (create.length > 0 && !provider.createCase) unsupported.push("createCase");
  if (update.length > 0 && !provider.updateCase) unsupported.push("updateCase");
  if (results.length > 0 && !provider.recordResults) unsupported.push("recordResults");

  const byRole: Record<string, number> = {};
  let files = 0;
  let bytes = 0;
  for (const result of results) {
    for (const attachment of result.attachments ?? []) {
      files += 1;
      bytes += attachment.body.byteLength;
      const role = attachment.role ?? "log";
      byRole[role] = (byRole[role] ?? 0) + 1;
    }
  }

  return {
    provider: provider.name,
    target: provider.describeTarget?.(),
    local,
    remote,
    create,
    update,
    unchanged,
    adopted,
    skipped,
    orphaned,
    results,
    attachments: { files, bytes, oversized, byRole },
    unsupported,
    driftUncheckable,
    partialRunWarning,
  };
}

// --- apply ------------------------------------------------------------------

export interface ApplySyncArgs {
  analysis: SyncAnalysis;
  provider: SyncProvider;
  lockfile: Lockfile;
  config: SyncEngineConfig;
}

export interface ApplySyncDeps {
  logger: { warn(msg: string): void };
}

/**
 * Execute the plan. Mutates the passed lockfile so the caller can persist it
 * even when a later stage fails — a created case whose binding was lost would
 * be re-created on the next run, which is the one duplicate we can actually
 * cause.
 */
export async function applySync(
  args: ApplySyncArgs,
  deps: ApplySyncDeps,
): Promise<SyncApplyResult> {
  const { analysis, provider, lockfile, config } = args;

  const result: SyncApplyResult = {
    created: [],
    updated: [],
    resultsRecorded: 0,
    resultsSkipped: [],
    attachmentsUploaded: 0,
    errors: [],
  };

  const byFingerprint = new Map(analysis.local.map((b) => [b.fingerprint, b]));
  const results = [...analysis.results];

  if (analysis.create.length > 0 && provider.createCase) {
    for (const planned of analysis.create) {
      try {
        // Sequential on purpose. Providers rate-limit case creation hard, and a
        // case created twice cannot be undone from here — there is no id to
        // delete, because the duplicate is the one we failed to record.
        const created = await provider.createCase(planned.body);
        setEntry(lockfile, provider.name, planned.fingerprint, {
          caseId: created.id,
          url: created.url,
          hash: hashCaseBody(created.body ?? planned.body),
          title: created.title,
          owned: true,
        });
        result.created.push({ scenario: planned.scenario, caseId: created.id, url: created.url });

        const behaviour = byFingerprint.get(planned.fingerprint);
        if (behaviour) {
          const pending = toCaseResult({ behaviour, caseId: created.id, provider, config });
          if (pending) results.push(pending.result);
        }
      } catch (err) {
        result.errors.push(`create "${planned.scenario}": ${(err as Error).message}`);
      }
    }
  }

  if (analysis.update.length > 0 && provider.updateCase) {
    for (const planned of analysis.update) {
      try {
        const updated = await provider.updateCase(planned.caseId, planned.body);
        setEntry(lockfile, provider.name, planned.fingerprint, {
          caseId: updated.id,
          url: updated.url,
          hash: hashCaseBody(updated.body ?? planned.body),
          title: updated.title,
          owned: true,
        });
        result.updated.push({ scenario: planned.scenario, caseId: updated.id, url: updated.url });
      } catch (err) {
        result.errors.push(`update "${planned.scenario}" (${planned.caseId}): ${(err as Error).message}`);
      }
    }
  }

  // Keep unchanged bindings' urls fresh without disturbing ownership or the
  // stored hash the drift guard compares against.
  for (const planned of analysis.unchanged) {
    const existing: LockEntry | undefined = entriesFor(lockfile, provider.name)[planned.fingerprint];
    if (existing) {
      setEntry(lockfile, provider.name, planned.fingerprint, { ...existing, url: planned.url });
    }
  }

  // Record ticket-bound cases so the binding survives a ticket id being removed
  // from the test later. `hash` stays empty: we did not write this body and must
  // never be tempted to compare against it.
  for (const planned of analysis.adopted) {
    setEntry(lockfile, provider.name, planned.fingerprint, {
      caseId: planned.caseId,
      url: planned.url,
      hash: "",
      title: planned.scenario,
      owned: false,
    });
  }

  if (results.length > 0 && provider.recordResults) {
    try {
      const summary = await provider.recordResults(results);
      result.resultsRecorded = summary.recorded;
      result.resultsSkipped = summary.skipped;
      result.attachmentsUploaded = summary.attachmentsUploaded;
      result.runUrl = summary.runUrl;
    } catch (err) {
      result.errors.push(`record results: ${(err as Error).message}`);
    }
  } else if (results.length > 0) {
    deps.logger.warn(
      `${provider.name} does not support recording results — ${results.length} execution(s) not pushed.`,
    );
  }

  return result;
}
