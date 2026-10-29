import { describe, it, expect } from "vitest";

import { ariaLines, diffAria, screenFrames, summarizeAriaChanges } from "./aria-diff.js";
import type { DocEntry } from "./types/story.js";

const works = (opts: { composer?: boolean; search?: string; menu?: boolean } = {}) =>
  [
    `- heading "Works" [level=1]`,
    `- textbox "Search"${opts.search ? `: ${opts.search}` : ""}`,
    `- button "Toggle column visibility"`,
    ...(opts.menu
      ? [`- menu:`, `  - menuitemcheckbox "Composer"${opts.composer === false ? "" : " [checked]"}`]
      : []),
    `- table:`,
    `  - rowgroup:`,
    `    - row "Title${opts.composer === false ? "" : " Composer"}":`,
    `      - columnheader "Title"`,
    ...(opts.composer === false ? [] : [`      - columnheader "Composer"`]),
    `  - rowgroup:`,
    `    - row "Amber Bloom${opts.composer === false ? "" : " Ida Vale"}":`,
    `      - cell "Amber Bloom":`,
    `        - link "Amber Bloom":`,
    `          - /url: /works/1`,
    ...(opts.composer === false ? [] : [`      - cell "Ida Vale"`]),
  ].join("\n");

describe("ariaLines", () => {
  it("keeps named elements and drops properties, bare containers and rows", () => {
    expect(ariaLines(works())).toEqual([
      `heading "Works" [level=1]`,
      `textbox "Search"`,
      `button "Toggle column visibility"`,
      `columnheader "Title"`,
      `columnheader "Composer"`,
      `cell "Amber Bloom"`,
      `link "Amber Bloom"`,
      `cell "Ida Vale"`,
    ]);
  });
});

describe("diffAria", () => {
  it("reports unnamed controls, which are not containers", () => {
    expect(diffAria("- textbox", "")).toEqual([{ kind: "removed", line: "textbox" }]);
    expect(diffAria("", "- button")).toEqual([{ kind: "added", line: "button" }]);
    expect(diffAria("- list:\n  - listitem:", "")).toEqual([]);
  });

  it("returns [] for the same screen", () => {
    expect(diffAria(works(), works())).toEqual([]);
  });

  it("pairs a state change on the same element", () => {
    expect(diffAria(works({ menu: true }), works({ menu: true, composer: false }))).toEqual([
      { kind: "changed", before: `menuitemcheckbox "Composer" [checked]`, after: `menuitemcheckbox "Composer"` },
      { kind: "removed", line: `columnheader "Composer"` },
      { kind: "removed", line: `cell "Ida Vale"` },
    ]);
  });

  it("reports what appeared, typed text included", () => {
    expect(diffAria(works(), works({ search: "Silver", menu: true }))).toEqual([
      { kind: "changed", before: `textbox "Search"`, after: `textbox "Search": Silver` },
      { kind: "added", line: `menuitemcheckbox "Composer" [checked]` },
    ]);
  });

  it("lists state changes first, and never pairs unnamed text", () => {
    expect(diffAria(`- text: "50"\n- checkbox "A" [checked]\n- link "Gone"`, `- link "New"\n- text: Title\n- checkbox "A"`)).toEqual([
      { kind: "changed", before: `checkbox "A" [checked]`, after: `checkbox "A"` },
      { kind: "added", line: `link "New"` },
      { kind: "added", line: `text: Title` },
      { kind: "removed", line: `text: "50"` },
      { kind: "removed", line: `link "Gone"` },
    ]);
  });

  it("compares lines as a multiset, not by position", () => {
    const before = `- link "A"\n- link "B"`;
    expect(diffAria(before, `- link "New"\n${before}`)).toEqual([{ kind: "added", line: `link "New"` }]);
    expect(diffAria(`- link "A"\n- link "A"`, `- link "A"`)).toEqual([{ kind: "removed", line: `link "A"` }]);
  });
});

describe("summarizeAriaChanges", () => {
  it("writes one line per change and counts the rest past max", () => {
    expect(
      summarizeAriaChanges(
        [
          { kind: "added", line: `link "A"` },
          { kind: "removed", line: `link "B"` },
          { kind: "changed", before: `checkbox "C" [checked]`, after: `checkbox "C"` },
        ],
        2,
      ),
    ).toEqual([`+ link "A"`, `− link "B"`, `… and 1 more`]);
  });
});

describe("screenFrames", () => {
  const shot = (aria?: string, alt?: string): DocEntry => ({
    kind: "screenshot",
    path: "x.png",
    phase: "runtime",
    ...(alt && { alt }),
    ...(aria !== undefined && { aria }),
  });

  it("lists screenshots with a screen, each with changes since the last one", () => {
    const frames = screenFrames([
      { text: "the works page", docs: [shot(works(), "Works")] },
      { text: "no screen recorded", docs: [shot()] },
      { text: "nothing happens", docs: [{ kind: "note", text: "n", phase: "runtime", children: [shot(works())] }] },
      { text: "Composer is hidden", docs: [shot(works({ composer: false }))] },
    ]);
    expect(frames.map((f) => [f.stepIndex, f.step, f.changes?.length])).toEqual([
      [0, "the works page", undefined],
      [2, "nothing happens", 0],
      [3, "Composer is hidden", 2],
    ]);
    expect(frames[0]!.alt).toBe("Works");
  });
});
