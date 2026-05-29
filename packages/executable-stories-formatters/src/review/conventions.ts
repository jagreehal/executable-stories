/**
 * Convention-based derivation for the review report.
 *
 * Audience and change-type are derived with ZERO authoring burden: audience
 * from the test file's name/location, change-type from a `change:*` tag. This
 * keeps the review capability a formatter concern — no new story API, no
 * adapter changes (see the Evidence-Driven Review design).
 */

import type { ChangeType, ReviewAudience } from "../types/review";

/** Tag prefix that declares a claim's change-type, e.g. `change:bugfix`. */
const CHANGE_TAG_PREFIX = "change:";
/** Tag prefix that explicitly overrides the derived audience, e.g. `audience:stakeholder`. */
const AUDIENCE_TAG_PREFIX = "audience:";

const VALID_CHANGE_TYPES: ReadonlySet<ChangeType> = new Set<ChangeType>([
  "feature",
  "bugfix",
  "refactor",
  "perf",
  "deps",
]);

/**
 * Tests whose name/location marks them as end-to-end / behavioural, and so
 * addressed to the stakeholder audience. Matches `*.e2e.*`, an `e2e/` path
 * segment, and Playwright specs (`.spec.` — Playwright is the e2e tier here).
 */
const STAKEHOLDER_FILE = /(?:\.e2e\.)|(?:^|\/)e2e\/|(?:\.spec\.)/i;

/** Source-file extensions we treat as reviewable code. */
const CODE_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "go",
  "rs",
  "kt",
  "kts",
  "java",
  "cs",
  "rb",
]);

/** Infixes that mark a file as a test, stripped to recover the source base key. */
const TEST_INFIX = /\.(?:story\.)?(?:int\.|e2e\.|unit\.)?(?:test|spec|cy)\.[a-z]+$/i;

/**
 * Derive the audience for a claim.
 *
 * An explicit `audience:<value>` tag always wins; otherwise the file convention
 * decides (e2e/spec → stakeholder, everything else → engineer).
 */
export function deriveAudience(sourceFile: string, tags: string[]): ReviewAudience {
  const override = tags
    .map((t) => t.toLowerCase())
    .find((t) => t.startsWith(AUDIENCE_TAG_PREFIX));
  if (override) {
    const value = override.slice(AUDIENCE_TAG_PREFIX.length);
    if (value === "stakeholder" || value === "engineer") return value;
  }
  return STAKEHOLDER_FILE.test(sourceFile) ? "stakeholder" : "engineer";
}

/** Derive the change-type from a `change:*` tag (defaults to `unknown`). */
export function deriveChangeType(tags: string[]): ChangeType {
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (lower.startsWith(CHANGE_TAG_PREFIX)) {
      const value = lower.slice(CHANGE_TAG_PREFIX.length) as ChangeType;
      if (VALID_CHANGE_TYPES.has(value)) return value;
    }
  }
  return "unknown";
}

/** The file extension (lower-case, no dot), or "" if none. */
function extensionOf(path: string): string {
  const base = path.split("/").pop() ?? path;
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.slice(dot + 1).toLowerCase();
}

/** Whether a path looks like a test file. */
export function isTestFile(path: string): boolean {
  return TEST_INFIX.test(path);
}

/**
 * Whether a changed file is reviewable application code — i.e. code we expect a
 * claim to back. Excludes test files, type decls, and non-code (docs, config,
 * locks). Only these files are eligible for the 🔴 uncovered alarm.
 */
export function isReviewableSource(path: string): boolean {
  if (isTestFile(path)) return false;
  if (path.endsWith(".d.ts")) return false;
  return CODE_EXTENSIONS.has(extensionOf(path));
}

/**
 * The correlation key for a test file: its path with the test infix stripped,
 * so `src/foo/bar.int.test.ts` → `src/foo/bar`. Used to match colocated tests
 * to the source file they sit next to (the v1 correlation heuristic).
 */
export function testBaseKey(testFile: string): string {
  return testFile.replace(TEST_INFIX, "");
}

/** The correlation key for a source file: its path with the extension stripped. */
export function sourceBaseKey(sourceFile: string): string {
  const dot = sourceFile.lastIndexOf(".");
  const slash = sourceFile.lastIndexOf("/");
  return dot > slash ? sourceFile.slice(0, dot) : sourceFile;
}
