import { describe, it, expect } from "vitest";

import { designLinks, isDesignLink } from "./design-links.js";

const link = (label: string, url: string) => ({ kind: "link", label, url, phase: "runtime" }) as never;

const scenario = (docEntries: unknown[], stepDocs: unknown[] = []) =>
  ({
    docEntries,
    steps: stepDocs.length > 0 ? [{ docEntries: stepDocs }] : [],
  }) as never;

describe("isDesignLink", () => {
  it("matches design-tool hosts and Design-prefixed labels", () => {
    expect(isDesignLink("Checkout v3", "https://www.figma.com/file/abc")).toBe(true);
    expect(isDesignLink("Flows", "https://zeplin.io/project/1")).toBe(true);
    expect(isDesignLink("Design system tokens", "https://internal.wiki/tokens")).toBe(true);
    expect(isDesignLink("Ticket", "https://tracker/US-101")).toBe(false);
    expect(isDesignLink("Checkout", "not a url")).toBe(false);
  });

  it("matches on the hostname, not anywhere in the URL", () => {
    expect(isDesignLink("Evil", "https://evil.example/figma.com")).toBe(false);
  });
});

describe("designLinks", () => {
  it("collects scenario- and step-level design links, deduped by url", () => {
    const figma = link("Figma — Checkout v3", "https://figma.com/file/abc");
    const s = scenario([figma, link("Ticket", "https://tracker/US-101")], [figma, link("Design notes", "https://wiki/x")]);
    expect(designLinks([s])).toEqual([
      { label: "Figma — Checkout v3", url: "https://figma.com/file/abc" },
      { label: "Design notes", url: "https://wiki/x" },
    ]);
  });

  it("rejects unsafe URL schemes even with a Design label", () => {
    const s = scenario([
      link("Design mock", "javascript:alert(1)"),
      link("Design mock", "vbscript:evil"),
      link("Design ok", "https://wiki/x"),
    ]);
    expect(designLinks([s])).toEqual([{ label: "Design ok", url: "https://wiki/x" }]);
  });

  it("recurses into grouped docs and returns [] when nothing matches", () => {
    const grouped = { kind: "note", text: "n", phase: "runtime", children: [link("Figma", "https://figma.com/f")] } as never;
    expect(designLinks([scenario([grouped])])).toEqual([{ label: "Figma", url: "https://figma.com/f" }]);
    expect(designLinks([scenario([link("Ticket", "https://tracker/1")])])).toEqual([]);
  });
});
