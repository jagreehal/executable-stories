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
