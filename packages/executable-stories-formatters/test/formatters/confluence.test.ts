/**
 * Tests for the Confluence (ADF) formatter.
 */

import { describe, it, expect } from "vitest";
import { ConfluenceFormatter } from "../../src/formatters/confluence";
import { canonicalizeRun } from "executable-stories-core/converters/acl/canonicalize";
import {
  createRawRun,
  createFailingTestCase,
  createTestCase,
  createStory,
} from "../fixtures/raw-runs/basic";

type AdfNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
  version?: number;
};

function walk(
  node: AdfNode,
  predicate: (n: AdfNode) => boolean,
  acc: AdfNode[] = [],
): AdfNode[] {
  if (predicate(node)) acc.push(node);
  if (node.content) {
    for (const child of node.content) walk(child, predicate, acc);
  }
  return acc;
}

function nodesOfType(root: AdfNode, type: string): AdfNode[] {
  return walk(root, (n) => n.type === type);
}

function flatText(root: AdfNode): string {
  const parts: string[] = [];
  walk(root, (n) => {
    if (n.type === "text" && n.text) parts.push(n.text);
    return false;
  });
  return parts.join("");
}

describe("ConfluenceFormatter", () => {
  const formatter = new ConfluenceFormatter();

  describe("format", () => {
    it("emits valid ADF document envelope", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const json = formatter.format(run);
      const adf = JSON.parse(json) as AdfNode;

      expect(adf.version).toBe(1);
      expect(adf.type).toBe("doc");
      expect(Array.isArray(adf.content)).toBe(true);
    });

    it("uses a heading-1 for the title", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const adf = JSON.parse(formatter.format(run)) as AdfNode;

      const h1 = nodesOfType(adf, "heading").find(
        (n) => n.attrs?.level === 1,
      );
      expect(h1).toBeDefined();
      expect(flatText(h1!)).toBe("User Stories");
    });

    it("includes a metadata table", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const adf = JSON.parse(formatter.format(run)) as AdfNode;

      const tables = nodesOfType(adf, "table");
      expect(tables.length).toBeGreaterThanOrEqual(1);
      const metaTable = tables[0];
      const text = flatText(metaTable);
      expect(text).toContain("Key");
      expect(text).toContain("Version");
      expect(text).toContain("1.0.0");
    });

    it("includes a summary table with counts", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const adf = JSON.parse(formatter.format(run)) as AdfNode;

      const text = flatText(adf);
      expect(text).toContain("Scenarios");
      expect(text).toContain("Passed");
      expect(text).toContain("Failed");
    });

    it("renders scenario heading with status icon", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const adf = JSON.parse(formatter.format(run)) as AdfNode;

      const headings = nodesOfType(adf, "heading");
      const scenarioHeading = headings.find((h) =>
        flatText(h).includes("User logs in successfully"),
      );
      expect(scenarioHeading).toBeDefined();
      expect(flatText(scenarioHeading!)).toContain("✅");
    });

    it("renders steps as a bulletList with strong keyword", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const adf = JSON.parse(formatter.format(run)) as AdfNode;

      const lists = nodesOfType(adf, "bulletList");
      expect(lists.length).toBeGreaterThan(0);
      const text = flatText(lists[0]);
      expect(text).toContain("Given ");
      expect(text).toContain("user is on login page");

      // Keyword should have a strong mark on the text node
      const strongTexts = walk(
        lists[0],
        (n) => n.type === "text" && !!n.marks?.some((m) => m.type === "strong"),
      );
      expect(strongTexts.length).toBeGreaterThan(0);
    });

    it("renders code doc entries as codeBlock with language", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "user calls API",
                  docs: [
                    {
                      kind: "code",
                      label: "Request",
                      content: "POST /login",
                      lang: "http",
                      phase: "static",
                    },
                  ],
                },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const adf = JSON.parse(formatter.format(run)) as AdfNode;

      const codeBlocks = nodesOfType(adf, "codeBlock");
      const httpBlock = codeBlocks.find((c) => c.attrs?.language === "http");
      expect(httpBlock).toBeDefined();
      expect(flatText(httpBlock!)).toBe("POST /login");
    });

    it("renders note doc entries as info panels", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "context",
                  docs: [
                    { kind: "note", text: "Always start here", phase: "static" },
                  ],
                },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const adf = JSON.parse(formatter.format(run)) as AdfNode;

      const infoPanels = nodesOfType(adf, "panel").filter(
        (p) => p.attrs?.panelType === "info",
      );
      expect(infoPanels.length).toBeGreaterThan(0);
      expect(flatText(infoPanels[0])).toContain("Always start here");
    });

    it("renders table doc entries as ADF tables", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              steps: [
                {
                  keyword: "Given",
                  text: "users",
                  docs: [
                    {
                      kind: "table",
                      label: "Users",
                      columns: ["Name", "Role"],
                      rows: [
                        ["jag", "admin"],
                        ["sally", "user"],
                      ],
                      phase: "static",
                    },
                  ],
                },
              ],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const adf = JSON.parse(formatter.format(run)) as AdfNode;

      const tables = nodesOfType(adf, "table");
      // Metadata table + summary table + doc table
      const docTable = tables.find((t) => flatText(t).includes("admin"));
      expect(docTable).toBeDefined();
      const headers = nodesOfType(docTable!, "tableHeader");
      expect(headers.length).toBe(2);
      expect(flatText(headers[0])).toBe("Name");
    });

    it("renders link doc entries as link-marked text", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              docs: [
                {
                  kind: "link",
                  label: "Docs",
                  url: "https://example.com",
                  phase: "static",
                },
              ],
              steps: [{ keyword: "Given", text: "x" }],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const adf = JSON.parse(formatter.format(run)) as AdfNode;

      const linkTexts = walk(
        adf,
        (n) =>
          n.type === "text" &&
          !!n.marks?.some(
            (m) =>
              m.type === "link" && m.attrs?.href === "https://example.com",
          ),
      );
      expect(linkTexts.length).toBe(1);
      expect(linkTexts[0].text).toBe("Docs");
    });

    it("renders mermaid docs as codeBlock with language=mermaid", () => {
      const raw = createRawRun({
        testCases: [
          createTestCase({
            story: createStory({
              docs: [
                {
                  kind: "mermaid",
                  code: "graph TD; A-->B",
                  phase: "static",
                },
              ],
              steps: [{ keyword: "Given", text: "x" }],
            }),
          }),
        ],
      });
      const run = canonicalizeRun(raw);
      const adf = JSON.parse(formatter.format(run)) as AdfNode;

      const mermaidBlock = nodesOfType(adf, "codeBlock").find(
        (c) => c.attrs?.language === "mermaid",
      );
      expect(mermaidBlock).toBeDefined();
      expect(flatText(mermaidBlock!)).toContain("graph TD");
    });

    it("renders failing scenario error as warning panel + codeBlock", () => {
      const raw = createRawRun({
        testCases: [createFailingTestCase()],
      });
      const run = canonicalizeRun(raw);
      const adf = JSON.parse(formatter.format(run)) as AdfNode;

      const warning = nodesOfType(adf, "panel").find(
        (p) => p.attrs?.panelType === "warning",
      );
      expect(warning).toBeDefined();

      const codeBlocks = nodesOfType(adf, "codeBlock");
      const errorBlock = codeBlocks.find(
        (c) => c.attrs?.language === "text" && flatText(c).length > 0,
      );
      expect(errorBlock).toBeDefined();
    });

    it("resolves ticket URLs via template", () => {
      const f = new ConfluenceFormatter({
        ticketUrlTemplate: "https://jira.example.com/browse/{ticket}",
      });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const adf = JSON.parse(f.format(run)) as AdfNode;

      const ticketLinks = walk(
        adf,
        (n) =>
          n.type === "text" &&
          !!n.marks?.some(
            (m) =>
              m.type === "link" &&
              typeof m.attrs?.href === "string" &&
              (m.attrs.href as string).includes("jira.example.com/browse/JIRA-123"),
          ),
      );
      expect(ticketLinks.length).toBe(1);
    });

    it("pretty-prints by default and compacts when pretty=false", () => {
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const pretty = new ConfluenceFormatter().format(run);
      const compact = new ConfluenceFormatter({ pretty: false }).format(run);

      expect(pretty).toContain("\n");
      expect(compact).not.toContain("\n");
      // Both must still parse to the same JSON
      expect(JSON.parse(pretty)).toEqual(JSON.parse(compact));
    });

    it("respects custom title", () => {
      const f = new ConfluenceFormatter({ title: "Release Notes" });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const adf = JSON.parse(f.format(run)) as AdfNode;
      const h1 = nodesOfType(adf, "heading").find(
        (n) => n.attrs?.level === 1,
      );
      expect(flatText(h1!)).toBe("Release Notes");
    });

    it("omits metadata/summary tables when disabled", () => {
      const f = new ConfluenceFormatter({
        includeMetadata: false,
        includeSummaryTable: false,
      });
      const raw = createRawRun();
      const run = canonicalizeRun(raw);
      const adf = JSON.parse(f.format(run)) as AdfNode;

      // All remaining tables must come from doc entries, not top-level metadata
      const text = flatText(adf);
      expect(text).not.toContain("Key");
      expect(text).not.toContain("Scenarios");
    });
  });
});
