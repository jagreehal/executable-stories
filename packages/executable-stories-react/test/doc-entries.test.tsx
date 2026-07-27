import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ReportRoot } from "../src/context/ReportRoot";
import { DocEntry } from "../src/components/doc/DocEntry";
import { DocNote } from "../src/components/doc/DocNote";
import { DocTag } from "../src/components/doc/DocTag";
import { DocKv } from "../src/components/doc/DocKv";
import { DocCode } from "../src/components/doc/DocCode";
import { DocTable } from "../src/components/doc/DocTable";
import { DocLink } from "../src/components/doc/DocLink";
import { DocSection } from "../src/components/doc/DocSection";
import { DocMermaid } from "../src/components/doc/DocMermaid";
import { DocScreenshot } from "../src/components/doc/DocScreenshot";
import { DocVideo } from "../src/components/doc/DocVideo";
import { DocCustom } from "../src/components/doc/DocCustom";
import { DocState } from "../src/components/doc/DocState";
import { minimalReport } from "./fixtures/sample-report";

describe("DocNote", () => {
  it("renders text in a paragraph", () => {
    render(<DocNote entry={{ kind: "note", text: "hello", phase: "static" }} />);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});

describe("DocTag", () => {
  it("renders names in a labeled list", () => {
    render(<DocTag entry={{ kind: "tag", names: ["a", "b"], phase: "static" }} />);
    expect(screen.getByLabelText("Tags")).toBeInTheDocument();
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
  });
});

describe("DocKv", () => {
  it("renders label as <dt> and value as <dd>", () => {
    render(<DocKv entry={{ kind: "kv", label: "endpoint", value: "/api/x", phase: "static" }} />);
    expect(screen.getByText("endpoint").tagName).toBe("DT");
    expect(screen.getByText("/api/x").tagName).toBe("DD");
  });

  it("JSON-stringifies object values", () => {
    render(<DocKv entry={{ kind: "kv", label: "obj", value: { a: 1 }, phase: "static" }} />);
    expect(screen.getByText('{"a":1}')).toBeInTheDocument();
  });
});

describe("DocCode", () => {
  it("renders a <figure> with <pre><code>, applying language class when present", () => {
    const { container } = render(
      <DocCode entry={{ kind: "code", label: "Request", content: "const x = 1", lang: "ts", phase: "static" }} />
    );
    expect(container.querySelector("figure")).toBeInTheDocument();
    expect(container.querySelector("code")?.className).toContain("language-ts");
    expect(screen.getByText("const x = 1")).toBeInTheDocument();
  });

  it("respects renderers.code override via context", () => {
    render(
      <ReportRoot
        report={minimalReport}
        renderers={{ code: (entry) => <span data-test="custom-code">{entry.content.length}</span> }}
      >
        <DocCode entry={{ kind: "code", label: "x", content: "abc", phase: "static" }} />
      </ReportRoot>,
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

describe("DocTable", () => {
  it("renders a table with thead/tbody and scope=col headers", () => {
    const { container } = render(
      <DocTable
        entry={{
          kind: "table",
          label: "Headers",
          columns: ["Name", "Value"],
          rows: [["Content-Type", "application/json"]],
          phase: "static",
        }}
      />,
    );
    const table = container.querySelector("table")!;
    expect(within(table).getByText("Name").getAttribute("scope")).toBe("col");
    expect(within(table).getByText("application/json")).toBeInTheDocument();
  });
});

describe("DocLink", () => {
  it("renders an anchor with rel=noreferrer noopener", () => {
    render(<DocLink entry={{ kind: "link", label: "Spec", url: "https://x", phase: "static" }} />);
    const a = screen.getByRole("link", { name: "Spec" });
    expect(a).toHaveAttribute("href", "https://x");
    expect(a.getAttribute("rel")).toContain("noreferrer");
    expect(a.getAttribute("rel")).toContain("noopener");
  });
});

describe("DocSection", () => {
  it("parses markdown and sanitizes script tags", () => {
    const { container } = render(
      <DocSection
        entry={{
          kind: "section",
          title: "Notes",
          markdown: "## hello\n<script>alert('xss')</script>\n_italic_",
          phase: "static",
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Notes", level: 4 })).toBeInTheDocument();
    expect(container.querySelector("h2")).toBeInTheDocument();
    expect(container.querySelector("em")).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
  });

  it("respects renderers.section override", () => {
    render(
      <ReportRoot
        report={minimalReport}
        renderers={{ section: (e) => <article data-test="custom-section">{e.title}</article> }}
      >
        <DocSection entry={{ kind: "section", title: "T", markdown: "m", phase: "static" }} />
      </ReportRoot>,
    );
    expect(screen.getByText("T")).toBeInTheDocument();
  });
});

describe("DocMermaid", () => {
  it("renders source in <pre data-mermaid> by default (AI-readable)", () => {
    const { container } = render(
      <DocMermaid entry={{ kind: "mermaid", code: "graph TD\nA-->B", title: "Flow", phase: "static" }} />,
    );
    const pre = container.querySelector("pre[data-mermaid]");
    expect(pre).toBeInTheDocument();
    expect(pre?.textContent).toBe("graph TD\nA-->B");
  });

  it("respects renderers.mermaid override", () => {
    render(
      <ReportRoot
        report={minimalReport}
        renderers={{ mermaid: (e) => <svg aria-label={`rendered: ${e.code.length} chars`} /> }}
      >
        <DocMermaid entry={{ kind: "mermaid", code: "abc", phase: "static" }} />
      </ReportRoot>,
    );
    expect(screen.getByLabelText("rendered: 3 chars")).toBeInTheDocument();
  });
});

describe("DocScreenshot", () => {
  it("renders an <img> with alt and figcaption when alt is present", () => {
    render(<DocScreenshot entry={{ kind: "screenshot", path: "assets/a.png", alt: "An A", phase: "runtime" }} />);
    expect(screen.getByAltText("An A")).toBeInTheDocument();
    expect(screen.getByText("An A").tagName).toBe("FIGCAPTION");
  });

  it("renders without figcaption when alt is missing", () => {
    const { container } = render(
      <DocScreenshot entry={{ kind: "screenshot", path: "assets/a.png", phase: "runtime" }} />,
    );
    expect(container.querySelector("figcaption")).toBeNull();
  });

  it("renders a data: image URI", () => {
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP8z8BQDwAFgwJ/lYd9KgAAAABJRU5ErkJggg==";
    render(<DocScreenshot entry={{ kind: "screenshot", path: png, alt: "Inlined", phase: "runtime" }} />);
    expect(screen.getByAltText("Inlined")).toHaveAttribute("src", png);
  });

  it("renders an http(s) URL", () => {
    render(
      <DocScreenshot
        entry={{ kind: "screenshot", path: "https://cdn.example.com/a.png", alt: "Remote", phase: "runtime" }}
      />,
    );
    expect(screen.getByAltText("Remote")).toHaveAttribute("src", "https://cdn.example.com/a.png");
  });

  it("renders a 'Screenshot unavailable' placeholder for an absolute local filesystem path instead of a broken <img>", () => {
    const path = "/home/runner/work/app/app/test-results/dashboard.png";
    render(<DocScreenshot entry={{ kind: "screenshot", path, alt: "Dashboard", phase: "runtime" }} />);
    expect(screen.getByText("Screenshot unavailable")).toBeInTheDocument();
    expect(screen.getByText(path)).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders a placeholder for a disallowed scheme (e.g. javascript:) instead of an <img>", () => {
    render(
      <DocScreenshot
        entry={{ kind: "screenshot", path: "javascript:alert(1)", alt: "Malicious", phase: "runtime" }}
      />,
    );
    expect(screen.getByText("Screenshot unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});

describe("DocVideo", () => {
  it("renders a <video> with a caption for an http(s) URL", () => {
    const { container } = render(
      <DocVideo
        entry={{ kind: "video", path: "https://example.com/a.webm", caption: "Demo", phase: "runtime" }}
      />,
    );
    expect(container.querySelector("video")).toHaveAttribute("src", "https://example.com/a.webm");
    expect(screen.getByText("Demo")).toBeInTheDocument();
  });

  it("renders a 'Video unavailable' placeholder for an absolute local filesystem path instead of a broken <video>", () => {
    const path = "/home/runner/work/app/app/test-results/checkout.webm";
    const { container } = render(<DocVideo entry={{ kind: "video", path, caption: "Checkout flow", phase: "runtime" }} />);
    expect(screen.getByText("Video unavailable")).toBeInTheDocument();
    expect(screen.getByText(path)).toBeInTheDocument();
    expect(container.querySelector("video")).toBeNull();
  });
});

describe("DocCustom", () => {
  it("renders a JSON fallback when no custom renderer is registered", () => {
    const { container } = render(
      <DocCustom entry={{ kind: "custom", type: "chart", data: { x: 1 }, phase: "runtime" }} />,
    );
    expect(container.querySelector("[data-type=\"chart\"]")).toBeInTheDocument();
    expect(screen.getByText(/x.*1/s)).toBeInTheDocument();
  });

  it("invokes the registered custom renderer", () => {
    render(
      <ReportRoot
        report={minimalReport}
        customRenderers={{ chart: (e) => <em>{`type=${e.type}`}</em> }}
      >
        <DocCustom entry={{ kind: "custom", type: "chart", data: 42, phase: "runtime" }} />
      </ReportRoot>,
    );
    expect(screen.getByText("type=chart")).toBeInTheDocument();
  });

  it("uses fallback when registered renderers do not match the type", () => {
    render(
      <ReportRoot report={minimalReport} customRenderers={{ unrelated: () => <span>nope</span> }}>
        <DocCustom entry={{ kind: "custom", type: "chart", data: 42, phase: "runtime" }} />
      </ReportRoot>,
    );
    expect(screen.queryByText("nope")).toBeNull();
  });
});

describe("DocState", () => {
  it("renders label and pretty JSON in the code-figure chrome", () => {
    const { container } = render(
      <DocState entry={{ kind: "state", label: "Basket", value: { items: 1 }, phase: "runtime" }} />,
    );
    expect(screen.getByText("Basket")).toBeInTheDocument();
    expect(container.querySelector("code")?.textContent).toBe('{\n  "items": 1\n}');
  });

  it("falls back to a generic label when unlabeled", () => {
    render(<DocState entry={{ kind: "state", value: 7, phase: "runtime" }} />);
    expect(screen.getByText("State")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});

describe("DocEntry dispatcher", () => {
  it("dispatches to the right component by kind", () => {
    const { rerender, container } = render(
      <DocEntry entry={{ kind: "note", text: "n", phase: "static" }} />,
    );
    expect(container.querySelector("p")).toHaveTextContent("n");

    rerender(<DocEntry entry={{ kind: "kv", label: "k", value: "v", phase: "static" }} />);
    expect(container.querySelector("dl")).toBeInTheDocument();

    rerender(<DocEntry entry={{ kind: "state", label: "Order", value: { s: 1 }, phase: "runtime" }} />);
    expect(container.querySelector("figure")).toBeInTheDocument();
  });
});
