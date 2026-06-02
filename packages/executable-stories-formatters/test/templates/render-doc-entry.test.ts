/**
 * Tests for the Scenario Explorer's doc-entry renderer shipped in the Astro
 * Starlight template (templates/astro-starlight/src/lib/render-doc-entry.ts).
 * This is the logic that turns a story report's docs into the Explorer's detail
 * pane, so every doc kind's markup is pinned here.
 */

import { describe, it, expect } from "vitest";
import { renderDocEntry, renderDocs, escapeHtml } from "../../templates/astro-starlight/src/lib/render-doc-entry";

describe("escapeHtml", () => {
  it("escapes HTML-significant characters and coerces nullish to empty", () => {
    expect(escapeHtml('<a href="x">&')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(42)).toBe("42");
  });
});

describe("renderDocEntry — per kind", () => {
  it("skips tag (rendered as header pills, not a doc card)", () => {
    expect(renderDocEntry({ kind: "tag", names: ["a"] } as never)).toBe("");
  });

  it("note renders escaped text", () => {
    const html = renderDocEntry({ kind: "note", text: "<b>hi</b>" });
    expect(html).toContain("doc-note");
    expect(html).toContain("&lt;b&gt;hi&lt;/b&gt;");
  });

  it("kv stringifies non-string values", () => {
    const html = renderDocEntry({ kind: "kv", label: "cfg", value: { a: 1 } });
    expect(html).toContain("doc-kv__label");
    // JSON is HTML-escaped before insertion.
    expect(html).toContain("&quot;a&quot;: 1");
  });

  it("code emits a language class for highlight.js", () => {
    const html = renderDocEntry({ kind: "code", label: "snippet", lang: "ts", content: "const x = 1" });
    expect(html).toContain('class="language-ts"');
    expect(html).toContain("const x = 1");
  });

  it("table renders a real table with headers and rows", () => {
    const html = renderDocEntry({ kind: "table", label: "t", columns: ["A", "B"], rows: [["1", "2"]] });
    expect(html).toContain("<th>A</th><th>B</th>");
    expect(html).toContain("<td>1</td><td>2</td>");
  });

  it("link renders a safe external anchor", () => {
    const html = renderDocEntry({ kind: "link", label: "docs", url: "https://x.dev" });
    expect(html).toContain('href="https://x.dev"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("section emits hydration markup for marked", () => {
    const html = renderDocEntry({ kind: "section", title: "S", markdown: "# h" });
    expect(html).toContain("data-md=");
    expect(html).toContain(encodeURIComponent("# h"));
  });

  it("mermaid emits a .mermaid pre for the bundled renderer", () => {
    const html = renderDocEntry({ kind: "mermaid", title: "Flow", code: "graph LR; A-->B" });
    expect(html).toContain('class="mermaid"');
    expect(html).toContain("graph LR; A--&gt;B");
  });

  it("video renders a controls player with caption and poster", () => {
    const html = renderDocEntry({ kind: "video", path: "/stories/assets/v.mp4", poster: "/p.png", caption: "demo" });
    expect(html).toContain("<video controls");
    expect(html).toContain('poster="/p.png"');
    expect(html).toContain('src="/stories/assets/v.mp4"');
    expect(html).toContain("demo");
  });

  it("video falls back to a placeholder for a Windows filesystem path", () => {
    const html = renderDocEntry({ kind: "video", path: "C:\\videos\\run.mp4" });
    expect(html).toContain("doc-media--broken");
    expect(html).toContain("Video unavailable");
  });

  it("screenshot renders an img", () => {
    const html = renderDocEntry({ kind: "screenshot", path: "/shot.png", alt: "shot" });
    expect(html).toContain('<img src="/shot.png"');
    expect(html).toContain('alt="shot"');
  });

  it("custom (visual) renders a baseline/actual/diff grid", () => {
    const html = renderDocEntry({
      kind: "custom",
      type: "visual",
      data: { status: "diff", baseline: "/b.png", actual: "/a.png", diff: "/d.png" },
    });
    expect(html).toContain("doc-visual-grid");
    expect(html).toContain("Baseline");
    expect(html).toContain('src="/d.png"');
  });

  it("custom (non-visual) falls back to a JSON dump", () => {
    const html = renderDocEntry({ kind: "custom", type: "metrics", data: { count: 3 } });
    expect(html).toContain("&quot;count&quot;: 3");
  });

  it("recurses into children", () => {
    const html = renderDocEntry({
      kind: "note",
      text: "parent",
      children: [{ kind: "note", text: "child" }],
    });
    expect(html).toContain("doc-children");
    expect(html).toContain("child");
  });
});

describe("renderDocs", () => {
  it("returns a placeholder when there are no docs", () => {
    expect(renderDocs(undefined)).toContain("No docs attached");
    expect(renderDocs([])).toContain("No docs attached");
  });

  it("returns the placeholder when the only doc is a tag (renders to nothing)", () => {
    expect(renderDocs([{ kind: "tag", names: ["x"] } as never])).toContain("No docs attached");
  });

  it("concatenates rendered entries", () => {
    const html = renderDocs([
      { kind: "note", text: "one" },
      { kind: "note", text: "two" },
    ]);
    expect(html).toContain("one");
    expect(html).toContain("two");
  });
});
