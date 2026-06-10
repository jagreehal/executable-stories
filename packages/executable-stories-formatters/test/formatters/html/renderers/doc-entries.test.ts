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
  renderDocVideo,
  renderDocHtml,
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

describe("renderDocVideo", () => {
  it("renders a <video> player with src, poster and caption", () => {
    const html = renderDocVideo(
      {
        kind: "video",
        path: "attachments/abc/video.webm",
        caption: "Recorded walkthrough",
        poster: "attachments/abc/poster.png",
        phase: "runtime",
      },
      baseDeps,
    );
    expect(html).toContain("doc-video");
    expect(html).toContain("<video");
    expect(html).toContain('src="attachments/abc/video.webm"');
    expect(html).toContain('poster="attachments/abc/poster.png"');
    expect(html).toContain("Recorded walkthrough");
  });

  it("renders a placeholder for absolute filesystem paths instead of a broken <video>", () => {
    const html = renderDocVideo(
      {
        kind: "video",
        path: "/home/runner/work/foo/test-results/video.webm",
        caption: "Walkthrough",
        phase: "runtime",
      },
      { ...baseDeps, embedScreenshots: true },
    );
    expect(html).toContain("doc-video-missing");
    expect(html).toContain("Video unavailable");
    expect(html).not.toMatch(/<video\s/);
  });

  it("keeps the <video> for remote URLs", () => {
    const html = renderDocVideo(
      {
        kind: "video",
        path: "https://cdn.example.com/clip.mp4",
        phase: "runtime",
      },
      { ...baseDeps, embedScreenshots: true },
    );
    expect(html).toContain("<video");
    expect(html).toContain("https://cdn.example.com/clip.mp4");
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

describe("renderDocHtml", () => {
  it("renders url source as sandboxed iframe with src and open link", () => {
    const html = renderDocHtml(
      { kind: "html", url: "https://dash.example.com/run/42", title: "Dashboard", phase: "runtime" },
      baseDeps,
    );
    expect(html).toContain('<div class="doc-html">');
    expect(html).toContain('sandbox="allow-scripts"');
    expect(html).not.toContain("allow-same-origin");
    expect(html).toContain('src="https://dash.example.com/run/42"');
    expect(html).toContain("Dashboard");
    expect(html).toContain('class="doc-html-open"');
    expect(html).toContain('target="_blank"');
  });

  it("renders inline content as srcdoc with the blob open button", () => {
    const html = renderDocHtml(
      { kind: "html", content: "<h1>Chart</h1>", phase: "runtime" },
      baseDeps,
    );
    expect(html).toContain('srcdoc="<h1>Chart</h1>"');
    expect(html).toContain("doc-html-open-srcdoc");
    expect(html).not.toContain(' src=');
  });

  it("escapes inline content via escapeHtml for the srcdoc attribute", () => {
    const html = renderDocHtml(
      { kind: "html", content: '<div data-x="1">hi</div>', phase: "runtime" },
      {
        ...baseDeps,
        escapeHtml: (s: string) => s.replace(/"/g, "&quot;"),
      },
    );
    expect(html).toContain('srcdoc="<div data-x=&quot;1&quot;>hi</div>"');
  });

  it("inlines local path files into srcdoc via readHtmlFile", () => {
    const html = renderDocHtml(
      { kind: "html", path: "/reports/coverage.html", phase: "runtime" },
      {
        ...baseDeps,
        readHtmlFile: () => "<!doctype html><h1>Coverage</h1>",
      },
    );
    expect(html).toContain('srcdoc="<!doctype html><h1>Coverage</h1>"');
    expect(html).toContain("doc-html-open-srcdoc");
  });

  it("renders placeholder for unreadable absolute paths when readHtmlFile is provided", () => {
    const html = renderDocHtml(
      { kind: "html", path: "/home/runner/work/report.html", title: "Report", phase: "runtime" },
      {
        ...baseDeps,
        readHtmlFile: () => undefined,
      },
    );
    expect(html).toContain("doc-html-missing");
    expect(html).toContain("HTML unavailable");
    expect(html).toContain("/home/runner/work/report.html");
    expect(html).not.toContain("<iframe");
  });

  it("keeps relative paths as iframe src for the asset bundler", () => {
    const html = renderDocHtml(
      { kind: "html", path: "assets/report-abc123.html", phase: "runtime" },
      { ...baseDeps, readHtmlFile: () => undefined },
    );
    expect(html).toContain('src="assets/report-abc123.html"');
  });

  it("treats an http(s) path like a url", () => {
    const html = renderDocHtml(
      { kind: "html", path: "https://example.com/report.html", phase: "runtime" },
      baseDeps,
    );
    expect(html).toContain('src="https://example.com/report.html"');
  });

  it("defaults height to 400px and accepts number and string heights", () => {
    const def = renderDocHtml(
      { kind: "html", url: "https://example.com", phase: "runtime" },
      baseDeps,
    );
    expect(def).toContain("height: 400px;");

    const num = renderDocHtml(
      { kind: "html", url: "https://example.com", height: 600, phase: "runtime" },
      baseDeps,
    );
    expect(num).toContain("height: 600px;");

    const str = renderDocHtml(
      { kind: "html", url: "https://example.com", height: "60vh", phase: "runtime" },
      baseDeps,
    );
    expect(str).toContain("height: 60vh;");
  });

  it("dispatches via renderDocEntry", () => {
    const html = renderDocEntry(
      { kind: "html", url: "https://example.com", phase: "runtime" },
      baseDeps,
    );
    expect(html).toContain('class="doc-html-frame"');
  });
});
