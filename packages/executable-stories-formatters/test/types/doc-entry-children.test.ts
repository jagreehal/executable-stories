/**
 * Type tests for DocEntry children field.
 *
 * Verifies that the TypeScript DocEntry type accepts an optional
 * `children` array on every variant.
 */

import { describe, it, expect } from "vitest";
import type { DocEntry } from "../../src/types/story";

describe("DocEntry children type", () => {
  it("should accept children on a note entry", () => {
    const entry: DocEntry = {
      kind: "note",
      text: "parent",
      phase: "static",
      children: [{ kind: "note", text: "child", phase: "static" }],
    };
    expect(entry.children).toHaveLength(1);
  });

  it("should accept children on a tag entry", () => {
    const entry: DocEntry = {
      kind: "tag",
      names: ["smoke"],
      phase: "static",
      children: [{ kind: "note", text: "child", phase: "static" }],
    };
    expect(entry.children).toHaveLength(1);
  });

  it("should accept children on a kv entry", () => {
    const entry: DocEntry = {
      kind: "kv",
      label: "key",
      value: "val",
      phase: "static",
      children: [{ kind: "note", text: "child", phase: "static" }],
    };
    expect(entry.children).toHaveLength(1);
  });

  it("should accept children on a code entry", () => {
    const entry: DocEntry = {
      kind: "code",
      label: "snippet",
      content: "x = 1",
      phase: "static",
      children: [{ kind: "note", text: "child", phase: "static" }],
    };
    expect(entry.children).toHaveLength(1);
  });

  it("should accept children on a table entry", () => {
    const entry: DocEntry = {
      kind: "table",
      label: "data",
      columns: ["a"],
      rows: [["1"]],
      phase: "static",
      children: [{ kind: "note", text: "child", phase: "static" }],
    };
    expect(entry.children).toHaveLength(1);
  });

  it("should accept children on a link entry", () => {
    const entry: DocEntry = {
      kind: "link",
      label: "docs",
      url: "https://example.com",
      phase: "static",
      children: [{ kind: "note", text: "child", phase: "static" }],
    };
    expect(entry.children).toHaveLength(1);
  });

  it("should accept children on a section entry", () => {
    const entry: DocEntry = {
      kind: "section",
      title: "Details",
      markdown: "# Hello",
      phase: "static",
      children: [{ kind: "note", text: "child", phase: "static" }],
    };
    expect(entry.children).toHaveLength(1);
  });

  it("should accept children on a mermaid entry", () => {
    const entry: DocEntry = {
      kind: "mermaid",
      code: "graph TD; A-->B;",
      phase: "static",
      children: [{ kind: "note", text: "child", phase: "static" }],
    };
    expect(entry.children).toHaveLength(1);
  });

  it("should accept children on a screenshot entry", () => {
    const entry: DocEntry = {
      kind: "screenshot",
      path: "/img/shot.png",
      phase: "static",
      children: [{ kind: "note", text: "child", phase: "static" }],
    };
    expect(entry.children).toHaveLength(1);
  });

  it("should accept children on a custom entry", () => {
    const entry: DocEntry = {
      kind: "custom",
      type: "widget",
      data: { foo: "bar" },
      phase: "static",
      children: [{ kind: "note", text: "child", phase: "static" }],
    };
    expect(entry.children).toHaveLength(1);
  });

  it("should allow omitting children (optional)", () => {
    const entry: DocEntry = {
      kind: "note",
      text: "no children",
      phase: "static",
    };
    expect(entry).toBeDefined();
    // children should be undefined when not set
    expect((entry as { children?: unknown }).children).toBeUndefined();
  });

  it("should accept nested children (recursive)", () => {
    const entry: DocEntry = {
      kind: "note",
      text: "grandparent",
      phase: "static",
      children: [
        {
          kind: "code",
          label: "parent",
          content: "x = 1",
          phase: "runtime",
          children: [{ kind: "note", text: "child", phase: "static" }],
        },
      ],
    };
    expect(entry.children![0].children).toHaveLength(1);
  });
});
