import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DocHtml } from "../src/components/doc/DocHtml";
import type { ReportDocHtml } from "executable-stories-core";

const base = { kind: "html", phase: "runtime" } as const;

describe("DocHtml URL safety", () => {
  it("renders an open-in-new-tab link for http(s) urls", () => {
    const { container } = render(<DocHtml entry={{ ...base, url: "https://example.com/x" } as ReportDocHtml} />);
    const a = container.querySelector("a");
    expect(a?.getAttribute("href")).toBe("https://example.com/x");
  });

  it("renders no link for a javascript: url (XSS guard)", () => {
    const { container } = render(<DocHtml entry={{ ...base, url: "javascript:alert(1)" } as ReportDocHtml} />);
    expect(container.querySelector("a")).toBeNull();
    // and never used as the iframe src
    expect(container.querySelector("iframe")?.getAttribute("src") ?? "").not.toContain("javascript:");
  });

  it("rejects data: and vbscript: schemes too", () => {
    for (const url of ["data:text/html,<script>1</script>", "vbscript:msgbox(1)"]) {
      const { container } = render(<DocHtml entry={{ ...base, url } as ReportDocHtml} />);
      expect(container.querySelector("a")).toBeNull();
    }
  });

  it("allows relative paths", () => {
    const { container } = render(<DocHtml entry={{ ...base, path: "reports/embed.html" } as ReportDocHtml} />);
    expect(container.querySelector("a")?.getAttribute("href")).toBe("reports/embed.html");
  });

  it("inline content renders via srcdoc, no link", () => {
    const { container } = render(<DocHtml entry={{ ...base, content: "<p>hi</p>" } as ReportDocHtml} />);
    expect(container.querySelector("iframe")?.getAttribute("srcdoc")).toBe("<p>hi</p>");
    expect(container.querySelector("a")).toBeNull();
  });
});
