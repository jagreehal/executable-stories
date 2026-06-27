import { describe, it, expect } from "vitest";

import { mdLinkRewrite, rewriteMdLink } from "./md-link-rewrite.js";

/** The mdast node shape the rewriter accepts (kept internal to the plugin). */
type MdNode = Parameters<ReturnType<typeof mdLinkRewrite>>[0];

/** Run the plugin over a tiny mdast of links and return the resulting urls. */
function rewriteUrls(urls: string[]): string[] {
  const tree = { type: "root", children: urls.map((url) => ({ type: "link", url, children: [] })) };
  mdLinkRewrite()(tree as MdNode);
  return (tree.children as { url: string }[]).map((n) => n.url);
}

describe("rewriteMdLink", () => {
  it("rewrites a sibling .md link to its sibling directory route (one level up)", () => {
    // each .md becomes a dir route, so a sibling file is `../name/`
    expect(rewriteMdLink("./non-prod-poc-test.md")).toBe("../non-prod-poc-test/");
  });

  it("preserves a #hash", () => {
    expect(rewriteMdLink("./non-prod-poc-test.md#appendix-a")).toBe("../non-prod-poc-test/#appendix-a");
  });

  it("handles nested and parent-relative paths", () => {
    expect(rewriteMdLink("./sub/bar.md")).toBe("../sub/bar/");
    expect(rewriteMdLink("../guides/intro.md")).toBe("../../guides/intro/");
  });

  it("leaves external, absolute, anchor and non-md links untouched", () => {
    for (const url of ["https://example.com/x.md", "/already/route/", "#section", "mailto:a@b.com", "./image.png"]) {
      expect(rewriteMdLink(url)).toBeNull();
    }
  });
});

describe("mdLinkRewrite plugin", () => {
  it("rewrites only the markdown links in a tree", () => {
    const out = rewriteUrls(["./a.md", "/keep/", "https://x.com/y.md", "./b.mdx#h"]);
    expect(out).toEqual(["../a/", "/keep/", "https://x.com/y.md", "../b/#h"]);
  });

  it("never throws on a malformed tree", () => {
    expect(() => mdLinkRewrite()({ type: "root" } as MdNode)).not.toThrow();
  });
});
