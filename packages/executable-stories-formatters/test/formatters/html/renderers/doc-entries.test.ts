/**
 * Unit tests for doc entry renderers (fn(args, deps)).
 */

import { describe, it, expect } from "vitest";
import {
  renderDocNote,
  renderDocTag,
  renderDocKv,
  renderDocCode,
  renderDocTable,
  renderDocLink,
  renderDocSection,
  renderDocMermaid,
  renderDocScreenshot,
  renderDocCustom,
  renderDocEntry,
} from "../../../../src/formatters/html/renderers/doc-entries";

const baseDeps = {
  escapeHtml: (s: string) => s,
  syntaxHighlighting: false,
  markdownEnabled: false,
  mermaidEnabled: false,
};

describe("renderDocNote", () => {
  it("renders note with escaped text", () => {
    const html = renderDocNote(
      { kind: "note", text: "A note", phase: "static" },
      baseDeps,
    );
    expect(html).toContain('<div class="doc-note">');
    expect(html).toContain("A note");
  });
});

describe("renderDocTag", () => {
  it("renders tag items", () => {
    const html = renderDocTag(
      { kind: "tag", names: ["smoke", "regression"], phase: "static" },
      baseDeps,
    );
    expect(html).toContain('<div class="doc-tag">');
    expect(html).toContain("doc-tag-item");
    expect(html).toContain("smoke");
    expect(html).toContain("regression");
  });
});

describe("renderDocKv", () => {
  it("renders label and string value", () => {
    const html = renderDocKv(
      { kind: "kv", label: "Env", value: "prod", phase: "static" },
      baseDeps,
    );
    expect(html).toContain("doc-kv-label");
    expect(html).toContain("Env");
    expect(html).toContain("prod");
  });
});

describe("renderDocCode", () => {
  it("renders code block with label", () => {
    const html = renderDocCode(
      {
        kind: "code",
        label: "Example",
        content: "const x = 1;",
        phase: "static",
      },
      baseDeps,
    );
    expect(html).toContain("doc-code");
    expect(html).toContain("Example");
    expect(html).toContain("const x = 1;");
  });
});

describe("renderDocTable", () => {
  it("renders table with headers and rows", () => {
    const html = renderDocTable(
      {
        kind: "table",
        label: "Results",
        columns: ["A", "B"],
        rows: [["1", "2"]],
        phase: "static",
      },
      baseDeps,
    );
    expect(html).toContain("doc-table");
    expect(html).toContain("Results");
    expect(html).toContain("<th>");
    expect(html).toContain("<td>");
  });
});

describe("renderDocLink", () => {
  it("renders link with href and label", () => {
    const html = renderDocLink(
      {
        kind: "link",
        label: "Docs",
        url: "https://example.com",
        phase: "static",
      },
      baseDeps,
    );
    expect(html).toContain("doc-link");
    expect(html).toContain("https://example.com");
    expect(html).toContain("Docs");
  });
});

describe("renderDocSection", () => {
  it("renders section as pre when markdown disabled", () => {
    const html = renderDocSection(
      {
        kind: "section",
        title: "Section",
        markdown: "# Hi",
        phase: "static",
      },
      baseDeps,
    );
    expect(html).toContain("doc-section");
    expect(html).toContain("Section");
    expect(html).toContain("doc-section-content");
  });
});

describe("renderDocMermaid", () => {
  it("renders mermaid as code when mermaid disabled", () => {
    const html = renderDocMermaid(
      { kind: "mermaid", code: "A --> B", phase: "static" },
      baseDeps,
    );
    expect(html).toContain("doc-mermaid");
    expect(html).toContain("A --> B");
  });
});

describe("renderDocScreenshot", () => {
  it("renders img with src and alt", () => {
    const html = renderDocScreenshot(
      {
        kind: "screenshot",
        path: "https://example.com/img.png",
        alt: "Screenshot",
        phase: "static",
      },
      baseDeps,
    );
    expect(html).toContain("doc-screenshot");
    expect(html).toContain("img");
    expect(html).toContain("https://example.com/img.png");
  });

  it("does not call readScreenshot for http(s) URLs", () => {
    let called = false;
    const html = renderDocScreenshot(
      {
        kind: "screenshot",
        path: "https://example.com/img.png",
        alt: "Remote",
        phase: "static",
      },
      {
        ...baseDeps,
        embedScreenshots: true,
        readScreenshot: () => {
          called = true;
          return "data:image/png;base64,AAAA";
        },
      },
    );
    expect(called).toBe(false);
    expect(html).toContain("https://example.com/img.png");
  });

  it("inlines local files as data URIs when embedScreenshots is true", () => {
    const html = renderDocScreenshot(
      {
        kind: "screenshot",
        path: "/absolute/runner/path/foo.png",
        alt: "Local",
        phase: "static",
      },
      {
        ...baseDeps,
        embedScreenshots: true,
        readScreenshot: () => "data:image/png;base64,AAAA",
      },
    );
    expect(html).toContain("data:image/png;base64,AAAA");
    expect(html).not.toContain("/absolute/runner/path/foo.png");
  });

  it("renders placeholder for missing absolute paths instead of broken <img>", () => {
    const html = renderDocScreenshot(
      {
        kind: "screenshot",
        path: "/home/runner/work/foo/test-results/missing.png",
        alt: "Local",
        phase: "static",
      },
      {
        ...baseDeps,
        embedScreenshots: true,
        readScreenshot: () => undefined,
      },
    );
    // Placeholder rendered instead of `<img>` so browsers don't try to resolve
    // /home/runner/... against the host serving the HTML.
    expect(html).toContain("doc-screenshot-missing");
    expect(html).toContain("Screenshot unavailable");
    expect(html).toContain("/home/runner/work/foo/test-results/missing.png");
    expect(html).not.toMatch(/<img\s/);
  });

  it("falls back to original path for relative paths when read fails", () => {
    const html = renderDocScreenshot(
      {
        kind: "screenshot",
        path: "screenshots/foo.png",
        alt: "Local",
        phase: "static",
      },
      {
        ...baseDeps,
        embedScreenshots: true,
        readScreenshot: () => undefined,
      },
    );
    // Relative paths can still resolve next to the HTML, so keep the <img>.
    expect(html).toContain("screenshots/foo.png");
    expect(html).toContain("<img");
    expect(html).not.toContain("doc-screenshot-missing");
  });

  it("renders placeholder for missing Windows absolute paths", () => {
    const html = renderDocScreenshot(
      {
        kind: "screenshot",
        path: "C:\\runner\\work\\foo\\test-results\\missing.png",
        alt: "Windows Local",
        phase: "static",
      },
      {
        ...baseDeps,
        embedScreenshots: true,
        readScreenshot: () => undefined,
      },
    );
    expect(html).toContain("doc-screenshot-missing");
    expect(html).toContain("Screenshot unavailable");
    expect(html).toContain("C:\\runner\\work\\foo\\test-results\\missing.png");
    expect(html).not.toMatch(/<img\s/);
  });

  it("keeps img path when readScreenshot hook is not provided", () => {
    const html = renderDocScreenshot(
      {
        kind: "screenshot",
        path: "/home/runner/work/foo/test-results/missing.png",
        alt: "Local",
        phase: "static",
      },
      {
        ...baseDeps,
        embedScreenshots: true,
      },
    );
    // No readScreenshot implementation means embedding was not attempted.
    // Keep legacy `<img>` behavior instead of a missing placeholder.
    expect(html).toContain("<img");
    expect(html).toContain("/home/runner/work/foo/test-results/missing.png");
    expect(html).not.toContain("doc-screenshot-missing");
  });

  it("does not embed when embedScreenshots is false", () => {
    let called = false;
    const html = renderDocScreenshot(
      {
        kind: "screenshot",
        path: "/absolute/runner/path/foo.png",
        alt: "Local",
        phase: "static",
      },
      {
        ...baseDeps,
        embedScreenshots: false,
        readScreenshot: () => {
          called = true;
          return "data:image/png;base64,AAAA";
        },
      },
    );
    expect(called).toBe(false);
    expect(html).toContain("/absolute/runner/path/foo.png");
  });
});

describe("renderDocCustom", () => {
  it("renders type and JSON data", () => {
    const html = renderDocCustom(
      { kind: "custom", type: "MyType", data: { foo: 1 }, phase: "static" },
      baseDeps,
    );
    expect(html).toContain("doc-custom");
    expect(html).toContain("MyType");
    expect(html).toContain("foo");
  });

  it("renders visual custom docs with dedicated visual layout", () => {
    const html = renderDocCustom(
      {
        kind: "custom",
        type: "visual",
        data: {
          status: "diff",
          baseline: "baseline.png",
          actual: "actual.png",
          diff: "diff.png",
        },
        phase: "static",
      },
      baseDeps,
    );
    expect(html).toContain("doc-visual");
    expect(html).toContain("Visual Check");
    expect(html).toContain("baseline.png");
    expect(html).toContain("actual.png");
    expect(html).toContain("diff.png");
  });
});

describe("renderDocEntry", () => {
  it("dispatches to renderDocNote for note", () => {
    const html = renderDocEntry(
      { kind: "note", text: "Note", phase: "static" },
      baseDeps,
    );
    expect(html).toContain("doc-note");
    expect(html).toContain("Note");
  });
});

describe("children rendering", () => {
  it("renders children inside doc-children container", () => {
    const html = renderDocEntry(
      {
        kind: "note",
        text: "Parent",
        phase: "static",
        children: [{ kind: "note", text: "Child", phase: "static" }],
      },
      baseDeps,
    );
    expect(html).toContain("doc-children");
    expect(html).toContain("Child");
  });

  it("renders no children container when children absent", () => {
    const html = renderDocEntry(
      { kind: "note", text: "No kids", phase: "static" },
      baseDeps,
    );
    expect(html).not.toContain("doc-children");
  });

  it("renders recursive children (2 levels of doc-children)", () => {
    const html = renderDocEntry(
      {
        kind: "note",
        text: "Root",
        phase: "static",
        children: [
          {
            kind: "note",
            text: "Level 1",
            phase: "static",
            children: [
              { kind: "note", text: "Level 2", phase: "static" },
            ],
          },
        ],
      },
      baseDeps,
    );
    const matches = html.match(/doc-children/g);
    expect(matches).toHaveLength(2);
    expect(html).toContain("Level 2");
  });
});
