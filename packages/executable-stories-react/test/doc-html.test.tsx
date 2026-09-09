import { describe, it, expect } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
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
    // Contains rather than equals: the frame also carries the measuring script
    // (see "DocHtml auto-sizing" below), and the author's HTML is untouched.
    expect(container.querySelector("iframe")?.getAttribute("srcdoc")).toContain("<p>hi</p>");
    expect(container.querySelector("a")).toBeNull();
  });
});

describe("DocHtml auto-sizing", () => {
  it("injects the measuring script into an inline content embed", () => {
    const { container } = render(
      <DocHtml entry={{ ...base, content: "<p>hello</p>" } as ReportDocHtml} />,
    );

    const srcdoc = container.querySelector("iframe")?.getAttribute("srcdoc") ?? "";
    expect(srcdoc).toContain("<p>hello</p>");
    // Content-measured, not document-measured: see the ratchet note on
    // MEASURE_SCRIPT and the StretchedBody story.
    expect(srcdoc).toContain("getBoundingClientRect");
    expect(srcdoc).not.toContain("scrollHeight");
  });
  it("leaves a remote embed alone, since the report cannot inject into it", () => {
    // A url/path page is served by someone else. Only its own author can add
    // the child script, so it keeps the height the entry declared.
    const { container } = render(
      <DocHtml entry={{ ...base, url: "https://example.com/x", height: 600 } as ReportDocHtml} />,
    );

    const iframe = container.querySelector("iframe");
    expect(iframe?.getAttribute("srcdoc")).toBeNull();
    expect(iframe?.style.height).toBe("600px");
  });
  it("grows to the height the framed page reports", async () => {
    const { container } = render(
      <DocHtml entry={{ ...base, content: "<p>tall</p>", height: 400 } as ReportDocHtml} />,
    );
    const iframe = container.querySelector("iframe")!;
    expect(iframe.style.height).toBe("400px");

    // The child script posts this once it has measured itself.
    fireEvent(
      window,
      new MessageEvent("message", {
        data: { __esHtmlHeight: 850 },
        source: iframe.contentWindow,
      }),
    );

    await waitFor(() => expect(iframe.style.height).toBe("850px"));
  });
  it("ignores a height posted by anything other than its own frame", () => {
    // Every script on the page can postMessage at the report. Only the frame
    // this component owns may resize it.
    const { container } = render(
      <DocHtml entry={{ ...base, content: "<p>x</p>", height: 400 } as ReportDocHtml} />,
    );
    const iframe = container.querySelector("iframe")!;

    fireEvent(window, new MessageEvent("message", { data: { __esHtmlHeight: 9000 } }));

    expect(iframe.style.height).toBe("400px");
  });

  it("caps a runaway height rather than letting the page grow without bound", () => {
    const { container } = render(
      <DocHtml entry={{ ...base, content: "<p>x</p>" } as ReportDocHtml} />,
    );
    const iframe = container.querySelector("iframe")!;

    fireEvent(
      window,
      new MessageEvent("message", {
        data: { __esHtmlHeight: 10_000_000 },
        source: iframe.contentWindow,
      }),
    );

    expect(iframe.style.height).toBe("5000px");
  });

  it("ignores a height that is not a usable number", () => {
    const { container } = render(
      <DocHtml entry={{ ...base, content: "<p>x</p>", height: 400 } as ReportDocHtml} />,
    );
    const iframe = container.querySelector("iframe")!;

    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, "800", null]) {
      fireEvent(
        window,
        new MessageEvent("message", {
          data: { __esHtmlHeight: bad },
          source: iframe.contentWindow,
        }),
      );
    }

    expect(iframe.style.height).toBe("400px");
  });
});
