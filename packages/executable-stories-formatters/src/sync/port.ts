/**
 * The test-management port.
 *
 * One interface, one engine, adapters per provider. Everything the engine does
 * — matching, planning, drift detection, lockfile bookkeeping, reporting — is
 * written once against these types. An adapter's only job is to translate
 * between them and a vendor API.
 *
 * Adding a provider is one file in `adapters/` plus one line in
 * `adapters/index.ts`, with no edits to `engine.ts`. If a new adapter forces an
 * engine change, this port is wrong and gets fixed then, on evidence.
 *
 * Every method except `listCases` is optional. A read-only provider implements
 * `listCases` alone and still produces a full coverage report; the engine
 * reports the missing capabilities in the plan instead of failing.
 */

/** A test case as it exists in the provider, normalized. */
export interface RemoteCase {
  /** Provider-native id, e.g. TestRail "1234" or Xray "PROJ-42". */
  id: string;
  /** Canonical URL a human can open. */
  url: string;
  title: string;
  /** Suite, folder, or component — whatever the provider groups by. */
  section?: string;
  /**
   * The content the provider currently holds, when it can supply it.
   *
   * Drift detection hashes this, not what we sent: providers normalize markup
   * on write, so hashing the request would flag every case as human-edited on
   * the very next run.
   */
  body?: CaseBody;
}

/** A story projected into provider-neutral case content. */
export interface CaseBody {
  title: string;
  steps: ReadonlyArray<{ keyword: string; text: string }>;
  /** Story docs rendered to plain text/markdown; adapters convert as needed. */
  description: string;
  links: ReadonlyArray<{ label: string; url: string }>;
}

/** Evidence uploaded alongside a result. */
export interface ResultAttachment {
  filename: string;
  mediaType: string;
  body: Uint8Array;
  role?: "screenshot" | "video" | "trace" | "log";
}

/** One execution record to push. */
export interface CaseResult {
  caseId: string;
  status: "passed" | "failed" | "skipped";
  durationMs: number;
  message?: string;
  /** Deep link into the generated HTML report for this scenario. */
  url?: string;
  attachments?: ResultAttachment[];
}

/** What a provider did with a batch of results. */
export interface RecordResultsSummary {
  /** Provider-native run/execution id, when one was created. */
  runId?: string;
  /** URL of the created run/execution, when the provider exposes one. */
  runUrl?: string;
  recorded: number;
  /** Results the provider declined (e.g. no status mapping configured). */
  skipped: Array<{ caseId: string; reason: string }>;
  attachmentsUploaded: number;
}

/**
 * A test-management system, reduced to what the engine needs.
 *
 * `createCase`/`updateCase` return the resulting {@link RemoteCase} rather than
 * just an id so the engine can hash the provider's own normalized copy.
 */
export interface SyncProvider {
  /** Stable key used in config, CLI args, and the lockfile. */
  name: string;
  listCases(): Promise<RemoteCase[]>;
  createCase?(body: CaseBody): Promise<RemoteCase>;
  updateCase?(id: string, body: CaseBody): Promise<RemoteCase>;
  recordResults?(results: CaseResult[]): Promise<RecordResultsSummary>;
  /**
   * Per-file limit. The engine skips oversized attachments and reports them in
   * the plan, rather than letting an adapter die mid-upload with half a run
   * already pushed.
   */
  maxAttachmentBytes?: number;
  /** Human-readable target, shown in the plan header (e.g. "ACME / Regression"). */
  describeTarget?(): string;
}

/** Injectable dependencies shared by every adapter. */
export interface AdapterDeps {
  fetch: typeof globalThis.fetch;
  logger: { warn(msg: string): void };
}
