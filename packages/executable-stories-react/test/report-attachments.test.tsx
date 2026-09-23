import { describe, it, expect } from "vitest";
import { render, within } from "@testing-library/react";
import type { ReportAttachment } from "executable-stories-core";
import { ReportAttachments } from "../src/components/ReportAttachments";

const identity = (name: string, mediaType: string, body: string): ReportAttachment => ({
  name,
  mediaType,
  body,
  contentEncoding: "IDENTITY",
});

const base64 = (name: string, mediaType: string, text: string): ReportAttachment => ({
  name,
  mediaType,
  body: Buffer.from(text, "utf8").toString("base64"),
  contentEncoding: "BASE64",
});

function group(attachments: ReportAttachment[]) {
  const { getByRole } = render(<ReportAttachments attachments={attachments} />);
  return getByRole("group", { name: "Attachments" });
}

describe("ReportAttachments text documents", () => {
  it("shows text/plain inline in a preformatted block", () => {
    const g = group([identity("server.log", "text/plain", "line one\nline two")]);
    expect(g.querySelector("pre")?.textContent).toBe("line one\nline two");
  });

  it("decodes a base64 text body as UTF-8", () => {
    const g = group([base64("notes.txt", "text/plain; charset=utf-8", "café ✓")]);
    expect(g.querySelector("pre")?.textContent).toBe("café ✓");
  });

  it("renders text/markdown as markdown", () => {
    const g = group([identity("README.md", "text/markdown", "# Title\n\nSome **bold** text")]);
    expect(within(g).getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(g.querySelector("strong")?.textContent).toBe("bold");
  });

  it("strips script from markdown", () => {
    const g = group([identity("x.md", "text/markdown", "hi <script>alert(1)</script>")]);
    expect(g.querySelector("script")).toBeNull();
  });

  it("renders text/html in a sandboxed frame, never in the report DOM", () => {
    const g = group([base64("invoice.html", "text/html", "<p>Invoice</p>")]);
    const frame = within(g).getByTitle("invoice.html");
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts");
    expect(frame.getAttribute("srcdoc")).toContain("<p>Invoice</p>");
    expect(g.querySelector("p")).toBeNull();
  });

  it("skips the preview of a body that is not valid base64 and keeps the link", () => {
    const g = group([{ name: "bad.txt", mediaType: "text/plain", body: "%%%", contentEncoding: "BASE64" }]);
    expect(g.querySelector("pre")).toBeNull();
    expect(within(g).getByRole("link", { name: /bad\.txt/ })).toBeInTheDocument();
  });

  it("keeps a download link next to inline text documents", () => {
    const g = group([identity("server.log", "text/plain", "x")]);
    expect(within(g).getByRole("link", { name: /server\.log/ })).toHaveAttribute("download", "server.log");
  });

  it("still links binary and other media types", () => {
    const g = group([identity("trace.json", "application/json", "{}")]);
    expect(g.querySelector("pre")).toBeNull();
    expect(within(g).getByRole("link", { name: /trace\.json/ })).toBeInTheDocument();
  });

  it("links an external attachment to its file and previews nothing", () => {
    const g = group([
      { name: "big.log", mediaType: "text/plain", body: "reports/big.log", contentEncoding: "IDENTITY", external: true },
    ]);
    expect(g.querySelector("pre")).toBeNull();
    expect(within(g).getByRole("link", { name: /big\.log/ })).toHaveAttribute("href", "reports/big.log");
  });

  it("never links an external attachment to an unsafe scheme", () => {
    const g = group([
      { name: "x.html", mediaType: "text/html", body: "javascript:alert(1)", contentEncoding: "IDENTITY", external: true },
    ]);
    expect(g.querySelector("iframe")).toBeNull();
    expect(g.querySelector("a")?.getAttribute("href") ?? "").not.toContain("javascript:");
  });
});
