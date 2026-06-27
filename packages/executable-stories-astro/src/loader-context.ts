/**
 * Shared Astro Content Layer plumbing used by both the stories loader and the
 * trajectory loader: the minimal LoaderContext shape, JSON reading, file
 * watching, and the run-JSON → canonical/report transforms.
 */
import fs from "node:fs";
import path from "node:path";

import {
  canonicalizeRun,
  synthesizeStories,
  toStoryReport,
  type RawRun,
  type TestRunResult,
  type StoryReport,
} from "executable-stories-core";

import { type ExecutableStoriesConfig } from "./config.js";

/** Minimal structural type for the bits of the Astro loader API we use. */
export interface LoaderContext {
  store: {
    clear: () => void;
    set: (entry: { id: string; data: Record<string, unknown> }) => void;
  };
  logger: { info: (msg: string) => void; warn: (msg: string) => void };
  watcher?: {
    add: (path: string) => void;
    on: (event: string, cb: (changedPath: string) => void) => void;
  };
}

export interface StoriesLoader {
  name: string;
  load: (context: LoaderContext) => Promise<void>;
}

export type TransformOptions = Pick<ExecutableStoriesConfig, "inputType" | "synthesize">;

/** Read the parsed JSON into a canonical TestRunResult (the trajectory loader needs this). */
export function toRunResult(raw: unknown, { inputType = "raw", synthesize = true }: TransformOptions): TestRunResult {
  if (inputType === "canonical") {
    return raw as TestRunResult;
  }
  const rawRun = synthesize ? synthesizeStories(raw as RawRun) : (raw as RawRun);
  return canonicalizeRun(rawRun);
}

export function toReport(raw: unknown, options: TransformOptions): StoryReport {
  return toStoryReport(toRunResult(raw, options));
}

/** Read + parse a source file, or null + a warning if unreadable yet. */
export function readSource(abs: string, ctx: LoaderContext): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (err) {
    ctx.logger.warn(
      `[executable-stories] could not read run JSON at ${abs}: ${(err as Error).message}. ` +
        `Run your tests to produce it (set rawRunPath in your reporter); the collection populates on the next change.`,
    );
    return null;
  }
}

/** Register a resync callback against every source file the dev watcher tracks. */
export function watchAll(ctx: LoaderContext, absPaths: string[], sync: () => void): void {
  if (!ctx.watcher) return;
  const set = new Set(absPaths);
  for (const abs of absPaths) ctx.watcher.add(abs);
  const onChange = (changed: string) => {
    if (set.has(path.resolve(changed))) sync();
  };
  ctx.watcher.on("change", onChange);
  ctx.watcher.on("add", onChange);
}
