/**
 * Schema validation tests for DocEntry children field.
 *
 * Verifies that the raw-run JSON schema accepts an optional `children`
 * array on every DocEntry variant.
 */

import { describe, it, expect } from "vitest";
import { validateRawRun } from "../../src/validation/schema-validator";

/** Minimal valid RawRun wrapping a single doc entry in story.docs */
function rawRunWithDoc(doc: Record<string, unknown>) {
  return {
    schemaVersion: 1,
    projectRoot: "/project",
    testCases: [
      {
        status: "pass",
        story: {
          scenario: "test",
          docs: [doc],
        },
      },
    ],
  };
}

describe("DocEntry children in JSON schema", () => {
  it("should accept a note with children", () => {
    const result = validateRawRun(
      rawRunWithDoc({
        kind: "note",
        text: "parent",
        phase: "static",
        children: [{ kind: "note", text: "child", phase: "static" }],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("should accept a tag with children", () => {
    const result = validateRawRun(
      rawRunWithDoc({
        kind: "tag",
        names: ["smoke"],
        phase: "static",
        children: [{ kind: "note", text: "child", phase: "static" }],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("should accept a kv with children", () => {
    const result = validateRawRun(
      rawRunWithDoc({
        kind: "kv",
        label: "key",
        value: "val",
        phase: "static",
        children: [{ kind: "note", text: "child", phase: "static" }],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("should accept a code with children", () => {
    const result = validateRawRun(
      rawRunWithDoc({
        kind: "code",
        label: "snippet",
        content: "console.log('hi')",
        phase: "static",
        children: [{ kind: "note", text: "child", phase: "static" }],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("should accept a table with children", () => {
    const result = validateRawRun(
      rawRunWithDoc({
        kind: "table",
        label: "data",
        columns: ["a"],
        rows: [["1"]],
        phase: "static",
        children: [{ kind: "note", text: "child", phase: "static" }],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("should accept a link with children", () => {
    const result = validateRawRun(
      rawRunWithDoc({
        kind: "link",
        label: "docs",
        url: "https://example.com",
        phase: "static",
        children: [{ kind: "note", text: "child", phase: "static" }],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("should accept a section with children", () => {
    const result = validateRawRun(
      rawRunWithDoc({
        kind: "section",
        title: "Details",
        markdown: "# Hello",
        phase: "static",
        children: [{ kind: "note", text: "child", phase: "static" }],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("should accept a mermaid with children", () => {
    const result = validateRawRun(
      rawRunWithDoc({
        kind: "mermaid",
        code: "graph TD; A-->B;",
        phase: "static",
        children: [{ kind: "note", text: "child", phase: "static" }],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("should accept a screenshot with children", () => {
    const result = validateRawRun(
      rawRunWithDoc({
        kind: "screenshot",
        path: "/img/shot.png",
        phase: "static",
        children: [{ kind: "note", text: "child", phase: "static" }],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("should accept a custom with children", () => {
    const result = validateRawRun(
      rawRunWithDoc({
        kind: "custom",
        type: "widget",
        data: { foo: "bar" },
        phase: "static",
        children: [{ kind: "note", text: "child", phase: "static" }],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("should accept doc entry without children (optional)", () => {
    const result = validateRawRun(
      rawRunWithDoc({
        kind: "note",
        text: "no children",
        phase: "static",
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("should accept nested children (children within children)", () => {
    const result = validateRawRun(
      rawRunWithDoc({
        kind: "note",
        text: "grandparent",
        phase: "static",
        children: [
          {
            kind: "note",
            text: "parent",
            phase: "static",
            children: [{ kind: "note", text: "child", phase: "static" }],
          },
        ],
      }),
    );
    expect(result.valid).toBe(true);
  });
});
