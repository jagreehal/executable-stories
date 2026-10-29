/**
 * Node-only store for story meta sent from the browser via cy.task.
 * Plugin writes; reporter reads. Keyed by spec + titlePath for merging with run results.
 *
 * Cypress runs `setupNodeEvents` (the plugin) and the Mocha reporter in
 * separate Node processes. Each entry is also written to a directory both
 * processes can name, which the reporter reads with {@link loadStore}.
 */

import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { StoryMeta, ScopedAttachment, RecordMetaPayload, FeatureInput } from "./types";

export interface StoredMeta {
  specRelative: string;
  titlePath: string[];
  meta: StoryMeta;
  attachments?: ScopedAttachment[];
  /** The step checklist for a failed test. */
  failureTrail?: string;
  /** When the plugin recorded it, so the reporter can tell which spec just ran. */
  recordedAt?: number;
  /** The Cypress project that ran the test. */
  projectRoot?: string;
}

function key(specRelative: string, titlePath: string[]): string {
  return `${specRelative}\0${titlePath.join("\0")}`;
}

const store = new Map<string, StoredMeta>();
const features = new Map<string, FeatureInput>();

const hash = (text: string) => createHash("sha1").update(text).digest("hex").slice(0, 16);

/** The files this store writes; nothing else in a directory is touched. */
const STORE_FILE = /^es-[0-9a-f]{16}\.json$/;

/** One base per user, so a shared temp folder never mixes users' runs. */
export const baseDir = () =>
  path.join(os.tmpdir(), `executable-stories-cypress-${process.getuid?.() ?? "user"}`);

const uid = process.getuid?.();

/** The temp folder is shared, so directories there must also be closed to other users. */
const inTemp = () => !process.env.EXECUTABLE_STORIES_CYPRESS_STORE;

/** A real directory (not a symlink) this user owns; in the temp folder, closed to others too. */
function trusted(dir: string): boolean {
  try {
    const stat = fs.lstatSync(dir);
    if (!stat.isDirectory()) return false;
    if (uid === undefined) return true;
    return stat.uid === uid && (!inTemp() || (stat.mode & 0o077) === 0);
  } catch {
    return false;
  }
}

/** Whether to read a run directory: it, and the per-user base above it in the temp folder, are trusted. */
const readable = (dir: string) => (!inTemp() || trusted(baseDir())) && trusted(dir);

/** Create `dir` for writing, and refuse one that is not trusted. */
function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (!trusted(dir)) {
    throw new Error(`executable-stories-cypress: refusing store directory ${dir}: not a private directory owned by this user`);
  }
}

/** Read one store file without following a symlink, and only if this user owns it. */
function readStoreFile(file: string): StoredFile | undefined {
  let fd: number | undefined;
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || (uid !== undefined && stat.uid !== uid)) return undefined;
    return JSON.parse(fs.readFileSync(fd, "utf8")) as StoredFile;
  } catch {
    // Half-written, foreign or unreadable: skip it rather than fail the report.
    return undefined;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

/**
 * Where one run's entries are shared, keyed by the Cypress server process: the
 * reporter runs in it and the plugin process is its child, so the plugin passes
 * `process.ppid` and the reporter `process.pid`, and runs never share a directory.
 * `EXECUTABLE_STORIES_CYPRESS_STORE` overrides it.
 */
export function storeDir(serverPid: number): string {
  return process.env.EXECUTABLE_STORIES_CYPRESS_STORE ?? path.join(baseDir(), String(serverPid));
}

interface StoredFile {
  stored: StoredMeta;
  feature?: FeatureInput;
}

function storeFiles(dir: string): string[] {
  try {
    return fs.readdirSync(dir).filter((f) => STORE_FILE.test(f));
  } catch {
    return [];
  }
}

/**
 * Replace what the getters see with what the plugin process recorded in `dir`,
 * this run's directory unless `dir` names another. A directory that is missing
 * or untrusted leaves nothing, so one run's stories never answer for another's.
 * The reporter calls this once per spec, before its lookups; the getters below
 * read memory only.
 */
export function loadStore(dir = storeDir(process.pid)): void {
  store.clear();
  features.clear();
  if (!readable(dir)) return;
  for (const file of storeFiles(dir)) {
    const read = readStoreFile(path.join(dir, file));
    if (!read) continue;
    store.set(key(read.stored.specRelative, read.stored.titlePath), read.stored);
    if (read.feature?.title) features.set(read.stored.specRelative, read.feature);
  }
}

/** The `config.env` key the plugin sets to its run's store directory. */
export const RUN_ENV = "executableStoriesRun";

/** What a `cypress.run()` result says about the run, for finding its stories without a run id. */
export interface RunIdentity {
  projectRoot?: string;
  specs: string[];
  /** Epoch ms; a story recorded outside this window belongs to another run. */
  startedAt?: number;
  endedAt?: number;
}

/**
 * The run directory holding this run's stories, for a result without a run id
 * (the plugin was not given `config`). Only a single matching directory counts:
 * when two runs of the same project and specs overlap, there is no telling them
 * apart, so this returns none and names them instead of guessing.
 */
export function findRunDir(run: RunIdentity): { dir?: string; candidates: string[] } {
  const chosen = process.env.EXECUTABLE_STORIES_CYPRESS_STORE;
  if (chosen) return readable(chosen) ? { dir: chosen, candidates: [chosen] } : { candidates: [] };
  if (!trusted(baseDir())) return { candidates: [] };
  const specs = new Set(run.specs);
  const belongs = (stored: StoredMeta) =>
    specs.has(stored.specRelative) &&
    (!run.projectRoot || stored.projectRoot === run.projectRoot) &&
    (run.startedAt === undefined || (stored.recordedAt ?? 0) >= run.startedAt) &&
    (run.endedAt === undefined || (stored.recordedAt ?? Infinity) <= run.endedAt);
  const candidates = fs
    .readdirSync(baseDir())
    .map((d) => path.join(baseDir(), d))
    .filter(trusted)
    .filter((dir) => storeFiles(dir).some((file) => {
      const read = readStoreFile(path.join(dir, file));
      return read !== undefined && belongs(read.stored);
    }));
  return candidates.length === 1 ? { dir: candidates[0], candidates } : { candidates };
}

export function recordMeta(payload: RecordMetaPayload): null {
  const k = key(payload.specRelative, payload.titlePath);
  const stored: StoredMeta = {
    specRelative: payload.specRelative,
    titlePath: payload.titlePath,
    meta: payload.meta,
    attachments: payload.attachments,
    ...(payload.failureTrail ? { failureTrail: payload.failureTrail } : {}),
    ...(payload.projectRoot ? { projectRoot: payload.projectRoot } : {}),
    recordedAt: Date.now(),
  };
  store.set(k, stored);
  if (payload.feature?.title) features.set(payload.specRelative, payload.feature);
  const file: StoredFile = { stored, ...(payload.feature?.title ? { feature: payload.feature } : {}) };
  const dir = storeDir(process.ppid);
  if (inTemp()) ensureDir(baseDir());
  ensureDir(dir);
  const flags =
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | (fs.constants.O_NOFOLLOW ?? 0);
  const fd = fs.openSync(path.join(dir, `es-${hash(k)}.json`), flags, 0o600);
  try {
    fs.writeSync(fd, JSON.stringify(file));
  } finally {
    fs.closeSync(fd);
  }
  return null;
}

/** The feature declared by a spec, if it declared one. */
export function getFeature(specRelative: string): FeatureInput | undefined {
  return features.get(specRelative);
}

export function getAttachments(specRelative: string, titlePath: string[]): ScopedAttachment[] | undefined {
  return store.get(key(specRelative, titlePath))?.attachments;
}

export function getMeta(specRelative: string, titlePath: string[]): StoryMeta | undefined {
  return store.get(key(specRelative, titlePath))?.meta;
}

export function getFailureTrail(specRelative: string, titlePath: string[]): string | undefined {
  return store.get(key(specRelative, titlePath))?.failureTrail;
}

export function getAllMeta(): StoredMeta[] {
  return Array.from(store.values());
}

/**
 * Forget every entry, and delete the files this store wrote for the run whose
 * server is `serverPid`. The plugin calls it as a run starts, with its parent's pid.
 */
export function clearStore(serverPid = process.pid): void {
  store.clear();
  features.clear();
  const dir = storeDir(serverPid);
  if (!readable(dir)) return;
  for (const file of storeFiles(dir)) fs.rmSync(path.join(dir, file), { force: true });
  try {
    fs.rmdirSync(dir);
  } catch {
    // Not empty (someone else's files) or already gone.
  }
}
