import * as fs from "node:fs";
import * as path from "node:path";

import { canonicalizeRun } from "executable-stories-core/converters/acl/index";
import { synthesizeStories } from "executable-stories-core/converters/synthesize";
import { ReportGenerator } from "./index";
import type { OutputFormat } from "./types/options";
import type { RawRun } from "executable-stories-core/types/raw";
import type { TestRunResult } from "executable-stories-core/types/test-result";

export interface WatchOptions {
  /** Path to the raw-run (or canonical) JSON the framework adapter writes. */
  input: string;
  outputDir: string;
  outputName: string;
  formats: OutputFormat[];
  /** Input is "raw" (default) or already-canonical "canonical". */
  inputType?: "raw" | "canonical";
  /** Synthesize story metadata for plain tests (raw input only). Default true. */
  synthesize?: boolean;
  /** Coalesce rapid change events. Default 150ms. */
  debounceMs?: number;
}

export interface RegenerateDeps {
  readFile?: (filePath: string) => string;
}

function toRun(data: unknown, inputType: "raw" | "canonical", synthesize: boolean): TestRunResult {
  if (inputType === "canonical") return data as TestRunResult;
  let raw = data as RawRun;
  if (synthesize) raw = synthesizeStories(raw);
  return canonicalizeRun(raw);
}

/**
 * Read a raw-run (or canonical) file once, canonicalize it, and regenerate the
 * requested agent artifacts via the canonical {@link ReportGenerator}. Returns
 * both the written file paths and the canonical run, so a caller that also needs
 * the run (e.g. `serve`, to diff it) does not read and canonicalize a second
 * time. This is the unit of work the watcher repeats.
 */
export async function regenerateRun(
  options: WatchOptions,
  deps: RegenerateDeps = {},
): Promise<{ files: string[]; run: TestRunResult }> {
  const read = deps.readFile ?? ((filePath: string) => fs.readFileSync(filePath, "utf8"));
  const data: unknown = JSON.parse(read(path.resolve(options.input)));
  const run = toRun(data, options.inputType ?? "raw", options.synthesize !== false);

  const generator = new ReportGenerator({
    formats: options.formats,
    outputDir: options.outputDir,
    outputName: options.outputName,
  });
  const result = await generator.generate(run);
  return { files: [...result.values()].flat(), run };
}

/** Regenerate artifacts and return just the written file paths. */
export async function regenerateArtifacts(
  options: WatchOptions,
  deps: RegenerateDeps = {},
): Promise<string[]> {
  return (await regenerateRun(options, deps)).files;
}

export interface WatchDeps extends RegenerateDeps {
  /** Watch a path, calling the listener on every change. Injectable for tests. */
  watch?: (filePath: string, listener: () => void) => { close: () => void };
  /** Override the regenerate step (tests). */
  regenerate?: (input: string) => Promise<string[]>;
  log?: (message: string) => void;
}

export interface WatchHandle {
  close: () => void;
}

/**
 * Keep the agent artifacts fresh: regenerate them whenever the framework
 * rewrites its raw-run file. Language-agnostic — any adapter that emits a
 * raw-run drives it. Pair with the host framework's own `--watch` to get a
 * behavior index that tracks the code.
 */
export function startWatch(options: WatchOptions, deps: WatchDeps = {}): WatchHandle {
  const log = deps.log ?? ((message: string) => console.log(message));
  const regenerate =
    deps.regenerate ?? ((input: string) => regenerateArtifacts({ ...options, input }, deps));
  const watchFn =
    deps.watch ?? ((filePath: string, listener: () => void) => fs.watch(filePath, listener));
  const debounceMs = options.debounceMs ?? 150;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let pending = false;

  const run = async (): Promise<void> => {
    // A regenerate is already in flight; remember to run once more when it ends.
    if (running) {
      pending = true;
      return;
    }
    running = true;
    try {
      const files = await regenerate(options.input);
      log(`Regenerated ${files.length} artifact file(s) from ${options.input}`);
    } catch (error) {
      log(`Watch regeneration failed: ${(error as Error).message}`);
    } finally {
      running = false;
      if (pending) {
        pending = false;
        trigger();
      }
    }
  };

  const trigger = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void run(), debounceMs);
  };

  trigger(); // initial build
  const watcher = watchFn(path.resolve(options.input), trigger);

  return {
    close: () => {
      if (timer) clearTimeout(timer);
      watcher.close();
    },
  };
}
