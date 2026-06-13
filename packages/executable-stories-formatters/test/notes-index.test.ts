import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { slug as githubSlug } from "github-slugger";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildScenarioNotesIndex,
  noteHref,
  noteLinkMarkdown,
  notesByScenarioId,
  writeScenarioNotesIndex,
  type ScenarioNotesIndex,
} from "../src/notes-index";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "notes-index-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function writeNote(relPath: string, frontmatter: string, body = ""): void {
  const full = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `---\n${frontmatter}\n---\n${body}`, "utf8");
}

describe("buildScenarioNotesIndex", () => {
  it("returns an empty index when the notes dir does not exist", () => {
    const index = buildScenarioNotesIndex(path.join(dir, "missing"));
    expect(index).toEqual({ schemaVersion: "1.0", notes: [] });
  });

  it("preserves the `--` separator so the slug matches Astro's github-slugger route", () => {
    const scenarioId = "feature-checkout-story-test--happy-path";
    writeNote(`${scenarioId}.mdx`, `title: "Checkout"\nscenarioId: ${scenarioId}`);

    const index = buildScenarioNotesIndex(dir);
    expect(index.notes).toEqual([
      { scenarioId, slug: scenarioId, title: "Checkout" },
    ]);
    // The route Astro 6 generates for `notes/<file>.mdx` is github-slug(stem).
    expect(index.notes[0].slug).toBe(githubSlug(scenarioId));
  });

  it("falls back to the filename basename when scenarioId frontmatter is absent", () => {
    writeNote("legacy-note.md", `title: "Legacy"`);
    const index = buildScenarioNotesIndex(dir);
    expect(index.notes[0]).toEqual({
      scenarioId: "legacy-note",
      slug: "legacy-note",
      title: "Legacy",
    });
  });

  it("synthesizes a title when frontmatter omits one", () => {
    writeNote("scn.md", `scenarioId: scn`);
    expect(buildScenarioNotesIndex(dir).notes[0].title).toBe("Business context — scn");
  });

  it("slugs nested folders into a route path and ignores non-markdown files", () => {
    writeNote(path.join("checkout", "Guest Checkout.mdx"), `scenarioId: scn-guest`);
    fs.writeFileSync(path.join(dir, "README.txt"), "ignore me", "utf8");

    const index = buildScenarioNotesIndex(dir);
    expect(index.notes).toHaveLength(1);
    expect(index.notes[0].slug).toBe("checkout/guest-checkout");
  });

  it("sorts entries by slug for stable output", () => {
    writeNote("b.md", `scenarioId: b`);
    writeNote("a.md", `scenarioId: a`);
    expect(buildScenarioNotesIndex(dir).notes.map((n) => n.slug)).toEqual(["a", "b"]);
  });
});

describe("writeScenarioNotesIndex", () => {
  it("writes the index JSON and creates parent dirs", () => {
    writeNote("scn.md", `scenarioId: scn\ntitle: "Note"`);
    const outPath = path.join(dir, "out", "notes-index.json");

    const index = writeScenarioNotesIndex(dir, outPath);
    expect(fs.existsSync(outPath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(outPath, "utf8"))).toEqual(index);
  });
});

describe("notesByScenarioId", () => {
  const idx = (notes: ScenarioNotesIndex["notes"]): ScenarioNotesIndex => ({
    schemaVersion: "1.0",
    notes,
  });

  it("keys notes by scenario id, first wins on a duplicate", () => {
    const map = notesByScenarioId(
      idx([
        { scenarioId: "s1", slug: "a", title: "First" },
        { scenarioId: "s1", slug: "b", title: "Second" },
        { scenarioId: "s2", slug: "c", title: "Third" },
      ]),
    );
    expect(map.size).toBe(2);
    expect(map.get("s1")?.slug).toBe("a");
    expect(map.get("s2")?.slug).toBe("c");
  });
});

describe("note link helpers", () => {
  it("owns the /notes/<slug>/ route shape in one place", () => {
    expect(noteHref({ slug: "feature-checkout--happy-path" })).toBe(
      "/notes/feature-checkout--happy-path/",
    );
    expect(noteLinkMarkdown({ slug: "feature-checkout--happy-path" })).toBe(
      "[Business context →](/notes/feature-checkout--happy-path/)",
    );
  });
});
