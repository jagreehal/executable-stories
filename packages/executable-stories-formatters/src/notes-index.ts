import * as fs from "node:fs";
import * as path from "node:path";

import { slug as githubSlug } from "github-slugger";
import { parse as parseYaml } from "yaml";

import { collectMarkdownFiles } from "./utils/markdown-files";

export interface ScenarioNoteIndexEntry {
  scenarioId: string;
  slug: string;
  title: string;
}

export interface ScenarioNotesIndex {
  schemaVersion: "1.0";
  notes: ScenarioNoteIndexEntry[];
}

interface FrontmatterData {
  title?: unknown;
  scenarioId?: unknown;
}

export function buildScenarioNotesIndex(notesDir: string): ScenarioNotesIndex {
  const entries = collectMarkdownFiles(notesDir)
    .map((filePath) => readScenarioNote(filePath, notesDir))
    .filter((entry): entry is ScenarioNoteIndexEntry => entry !== null)
    .sort((a, b) => a.slug.localeCompare(b.slug));

  return {
    schemaVersion: "1.0",
    notes: entries,
  };
}

/** Persist an already-built index. Separate from build so callers can scan once, write once. */
export function writeNotesIndex(index: ScenarioNotesIndex, outPath: string): ScenarioNotesIndex {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(index, null, 2), "utf8");
  return index;
}

export function writeScenarioNotesIndex(notesDir: string, outPath: string): ScenarioNotesIndex {
  return writeNotesIndex(buildScenarioNotesIndex(notesDir), outPath);
}

/**
 * Index notes by the scenario id they annotate. First note wins on a duplicate
 * `scenarioId` (deterministic — `buildScenarioNotesIndex` sorts by slug).
 */
export function notesByScenarioId(
  index: ScenarioNotesIndex,
): Map<string, ScenarioNoteIndexEntry> {
  const map = new Map<string, ScenarioNoteIndexEntry>();
  for (const note of index.notes) {
    if (!map.has(note.scenarioId)) map.set(note.scenarioId, note);
  }
  return map;
}

/**
 * The Astro route a scenario note is served at. Single source of truth for the
 * `/notes/<slug>/` URL shape — every surface (overview, generated story pages,
 * Explorer) must agree, or links drift and 404. The slug already matches Astro's
 * github-slugger route (see `toRouteSlug`).
 */
export function noteHref(note: Pick<ScenarioNoteIndexEntry, "slug">): string {
  return `/notes/${note.slug}/`;
}

/** Inline markdown link to a note — shared by the overview and generated story pages. */
export function noteLinkMarkdown(note: Pick<ScenarioNoteIndexEntry, "slug">): string {
  return `[Business context →](${noteHref(note)})`;
}

function readScenarioNote(filePath: string, notesDir: string): ScenarioNoteIndexEntry | null {
  const relative = path.relative(notesDir, filePath);
  const stem = relative.replace(/\.(?:md|mdx)$/u, "");
  const frontmatter = parseFrontmatter(fs.readFileSync(filePath, "utf8"));

  const scenarioId =
    typeof frontmatter.scenarioId === "string" && frontmatter.scenarioId.trim().length > 0
      ? frontmatter.scenarioId.trim()
      : path.basename(stem);

  const title =
    typeof frontmatter.title === "string" && frontmatter.title.trim().length > 0
      ? frontmatter.title.trim()
      : `Business context — ${scenarioId}`;

  return {
    scenarioId,
    slug: toRouteSlug(stem),
    title,
  };
}

function parseFrontmatter(source: string): FrontmatterData {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(source);
  if (!match) return {};
  const parsed = parseYaml(match[1]);
  return parsed && typeof parsed === "object" ? (parsed as FrontmatterData) : {};
}

/**
 * Reproduce the route slug Astro generates for a content-collection entry.
 *
 * Astro 6 slugs each path segment with `github-slugger` and strips a trailing
 * `/index` (see astro `getContentEntryIdAndSlug`). We must match it exactly:
 * the local `slugify` collapses `--` to `-`, which would point the Explorer /
 * overview "Business context" links at routes that 404, because the standard
 * scenario id (`feature-{file}--{title}`) keeps the double dash on disk.
 */
function toRouteSlug(stem: string): string {
  return stem
    .split(path.sep)
    .map((segment) => githubSlug(segment))
    .join("/")
    .replace(/\/index$/u, "");
}
