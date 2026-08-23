/**
 * The sync lockfile: the binding between a behaviour in the codebase and a case
 * in someone else's system.
 *
 * Committed to the repo on purpose. When CI creates a case, the lockfile diff
 * shows up in the pull request that caused it, so a reviewer sees the new case
 * and its link before it lands anywhere else.
 *
 * Keyed on `behaviourFingerprint` (content-derived) rather than the canonical
 * test-case id (`sha1(sourceFile::scenario)`), which changes the moment someone
 * renames a test or moves a file. Keying on the volatile id would orphan every
 * case on the first rename, which is exactly how these integrations lose trust.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

import type { CaseBody } from "./port";

export const DEFAULT_LOCKFILE_PATH = ".executable-stories/sync.lock.json";

const LOCKFILE_VERSION = 1;

/** One behaviour-to-case binding. */
export interface LockEntry {
  /** Provider-native case id. */
  caseId: string;
  url: string;
  /**
   * Hash of the provider's normalized copy as of our last write. A mismatch on
   * the next run means a human edited the case in the provider's UI.
   */
  hash: string;
  /** Last known title, so orphan reports are readable without a remote lookup. */
  title: string;
  /**
   * True only for cases this tool created.
   *
   * A case reached through a `story.tickets` id was authored by a human, so we
   * push executions against it and never touch its body. Without this flag the
   * first sync would silently overwrite hand-written cases, which is the single
   * fastest way to lose a QA team.
   */
  owned: boolean;
}

export interface Lockfile {
  version: number;
  /** provider name -> behaviour fingerprint -> entry */
  providers: Record<string, Record<string, LockEntry>>;
}

export function emptyLockfile(): Lockfile {
  return { version: LOCKFILE_VERSION, providers: {} };
}

/**
 * Hash provider-normalized case content.
 *
 * Deliberately excludes `links`: those embed report URLs that change with every
 * CI run (build number, artifact host), and treating that churn as a human edit
 * would make the drift guard fire constantly and get switched off.
 */
export function hashCaseBody(body: CaseBody): string {
  const canonical = JSON.stringify({
    title: body.title.trim(),
    steps: body.steps.map((s) => `${s.keyword.toLowerCase()}:${s.text.trim()}`),
    description: body.description.trim(),
  });
  return createHash("sha1").update(canonical).digest("hex").slice(0, 16);
}

/**
 * Parse lockfile text. `label` names the source in errors, so the caller decides
 * whether that is a path, a URL, or something else entirely.
 *
 * Split from {@link readLockfile} so the CLI can route every read and write
 * through its injected file dependencies and still share these error messages.
 */
export function parseLockfile(contents: string, label: string): Lockfile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (err) {
    throw new Error(
      `Sync lockfile at ${label} is not valid JSON: ${(err as Error).message}\n` +
        `Fix or delete it — deleting orphans every existing case binding, so prefer fixing.`,
      { cause: err },
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Sync lockfile at ${label} must contain an object.`);
  }

  const lock = parsed as Partial<Lockfile>;
  if (lock.version !== LOCKFILE_VERSION) {
    throw new Error(
      `Sync lockfile at ${label} has version ${String(lock.version)}, expected ${LOCKFILE_VERSION}.`,
    );
  }

  return { version: LOCKFILE_VERSION, providers: lock.providers ?? {} };
}

/** Serialize with sorted keys so the diff a reviewer sees is minimal and stable. */
export function serializeLockfile(lock: Lockfile): string {
  const providers: Lockfile["providers"] = {};
  for (const provider of Object.keys(lock.providers).sort()) {
    const entries = lock.providers[provider] ?? {};
    const sorted: Record<string, LockEntry> = {};
    for (const key of Object.keys(entries).sort()) sorted[key] = entries[key]!;
    providers[provider] = sorted;
  }

  return `${JSON.stringify({ version: LOCKFILE_VERSION, providers }, null, 2)}\n`;
}

export function readLockfile(file: string): Lockfile {
  if (!fs.existsSync(file)) return emptyLockfile();
  return parseLockfile(fs.readFileSync(file, "utf8"), file);
}

export function writeLockfile(file: string, lock: Lockfile): void {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, serializeLockfile(lock), "utf8");
}

export function entriesFor(lock: Lockfile, provider: string): Record<string, LockEntry> {
  return lock.providers[provider] ?? {};
}

export function setEntry(
  lock: Lockfile,
  provider: string,
  fingerprint: string,
  entry: LockEntry,
): void {
  lock.providers[provider] ??= {};
  lock.providers[provider]![fingerprint] = entry;
}
