/**
 * Every doc kind reaches every format, or the switch that skipped it fails to
 * compile.
 *
 * Thirteen doc kinds are rendered by a dozen switches spread across the
 * formatters, and until now four of those switches ended in a `default` that
 * returned an empty string, `null` or `undefined`. That shape compiles forever:
 * `story.video()` was added to all eleven adapters and then silently dropped by
 * the JUnit and Cucumber JSON writers, with nothing red to say so.
 *
 * This file is the runtime half of the guard. The compile-time half is
 * `assertNever` on each of those switches, which turns doc kind fourteen into a
 * type error rather than a formatter that quietly renders nothing.
 */
import { describe, expect, it } from "vitest";

import { AgentTextFormatter } from "../src/formatters/agent-text";
import { ConfluenceFormatter } from "../src/formatters/confluence";
import { CucumberJsonFormatter } from "../src/formatters/cucumber-json";
import { JUnitFormatter } from "../src/formatters/junit-xml";
import { MarkdownFormatter } from "../src/formatters/markdown";
import { stubs } from "./stubs";
import type { DocEntry } from "executable-stories-core/types/story";

/** One entry per doc kind, each carrying a marker string unique to this test. */
const DOC_ENTRIES: { kind: DocEntry["kind"]; entry: DocEntry; marker: string }[] = [
  { kind: "note", marker: "MARKER-note", entry: { kind: "note", phase: "static", text: "MARKER-note" } },
  { kind: "tag", marker: "MARKER-tag", entry: { kind: "tag", phase: "static", names: ["MARKER-tag"] } },
  { kind: "kv", marker: "MARKER-kv", entry: { kind: "kv", phase: "static", label: "MARKER-kv", value: 1 } },
  {
    kind: "code",
    marker: "MARKER-code",
    entry: { kind: "code", phase: "static", label: "src", content: "MARKER-code", lang: "ts" },
  },
  {
    kind: "table",
    marker: "MARKER-table",
    entry: { kind: "table", phase: "static", label: "t", columns: ["MARKER-table"], rows: [["1"]] },
  },
  {
    kind: "link",
    marker: "MARKER-link",
    entry: { kind: "link", phase: "static", label: "docs", url: "https://example.test/MARKER-link" },
  },
  {
    kind: "section",
    marker: "MARKER-section",
    entry: { kind: "section", phase: "static", title: "s", markdown: "MARKER-section" },
  },
  {
    kind: "mermaid",
    marker: "MARKER-mermaid",
    entry: { kind: "mermaid", phase: "static", code: "graph TD; MARKER-mermaid;" },
  },
  {
    kind: "screenshot",
    marker: "MARKER-screenshot",
    entry: { kind: "screenshot", phase: "runtime", path: "shots/MARKER-screenshot.png", alt: "shot" },
  },
  {
    kind: "video",
    marker: "MARKER-video",
    entry: { kind: "video", phase: "runtime", path: "videos/MARKER-video.mp4", caption: "run" },
  },
  {
    kind: "html",
    marker: "MARKER-html",
    entry: { kind: "html", phase: "runtime", url: "https://example.test/MARKER-html" },
  },
  {
    kind: "state",
    marker: "MARKER-state",
    entry: { kind: "state", phase: "runtime", label: "cart", value: { id: "MARKER-state" } },
  },
  {
    kind: "custom",
    marker: "MARKER-custom",
    entry: { kind: "custom", phase: "runtime", type: "trace", data: { id: "MARKER-custom" } },
  },
];

function runWithAllDocKinds() {
  return stubs.testRunResult({
    testCases: [
      stubs.testCaseResult({
        sourceFile: "src/checkout.story.test.ts",
        story: stubs.storyMeta({
          scenario: "Every doc kind survives the trip",
          steps: [
            {
              keyword: "Then",
              text: "the report carries each doc entry",
              docs: DOC_ENTRIES.map((d) => d.entry),
            },
          ],
        }),
        stepResults: [{ index: 0, status: "passed", durationMs: 1 }],
      }),
    ],
  });
}

describe("doc kind coverage", () => {
  it("carries every doc kind into JUnit XML", () => {
    const xml = new JUnitFormatter().format(runWithAllDocKinds());

    const missing = DOC_ENTRIES.filter((d) => !xml.includes(d.marker)).map((d) => d.kind);
    expect(missing).toEqual([]);
  });

  it("carries every doc kind into Cucumber JSON", () => {
    const json = JSON.stringify(new CucumberJsonFormatter().format(runWithAllDocKinds()));

    const missing = DOC_ENTRIES.filter((d) => !json.includes(d.marker)).map((d) => d.kind);
    expect(missing).toEqual([]);
  });

  it("carries every doc kind into Markdown", () => {
    const md = new MarkdownFormatter().format(runWithAllDocKinds());

    const missing = DOC_ENTRIES.filter((d) => !md.includes(d.marker)).map((d) => d.kind);
    expect(missing).toEqual([]);
  });

  it("carries every doc kind into Confluence ADF", () => {
    const adf = JSON.stringify(new ConfluenceFormatter().format(runWithAllDocKinds()));

    const missing = DOC_ENTRIES.filter((d) => !adf.includes(d.marker)).map((d) => d.kind);
    expect(missing).toEqual([]);
  });

  it("carries every doc kind into agent text", () => {
    const text = new AgentTextFormatter().format(runWithAllDocKinds());

    const missing = DOC_ENTRIES.filter((d) => !text.includes(d.marker)).map((d) => d.kind);
    expect(missing).toEqual([]);
  });

  it("covers every kind the union declares", () => {
    // Adding a kind to DocEntry without adding it here leaves the two tests
    // above passing while the new kind goes unchecked.
    const covered = new Set(DOC_ENTRIES.map((d) => d.kind));
    const declared: DocEntry["kind"][] = [
      "note",
      "tag",
      "kv",
      "code",
      "table",
      "link",
      "section",
      "mermaid",
      "screenshot",
      "video",
      "html",
      "state",
      "custom",
    ];
    expect(declared.filter((k) => !covered.has(k))).toEqual([]);
  });
});
