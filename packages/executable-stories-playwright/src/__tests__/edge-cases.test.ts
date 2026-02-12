/**
 * Edge case tests for the Playwright story API.
 *
 * Tests boundary conditions, special characters, empty values, and unusual usage patterns.
 */
import { test, expect } from "@playwright/test";
import { story } from "../story-api";
import type { StoryMeta } from "../types";

function getStoryMeta(testInfo: { annotations: Array<{ type: string; description?: string }> }): StoryMeta | undefined {
  const annotation = testInfo.annotations.find((a) => a.type === "story-meta");
  if (!annotation?.description) return undefined;
  return JSON.parse(annotation.description);
}

test.describe("empty and minimal values", () => {
  test("handles empty step text", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
    expect(meta!.steps[0].text).toBe("");
  });

  test("handles whitespace-only step text", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("   ");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(1);
    expect(meta!.steps[0].text).toBe("   ");
  });

  test("handles scenario with no steps", async ({}, testInfo) => {
    story.init(testInfo);

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toEqual([]);
    expect(meta!.scenario).toBe("handles scenario with no steps");
  });

  test("handles empty tags array", async ({}, testInfo) => {
    story.init(testInfo, { tags: [] });

    const meta = getStoryMeta(testInfo);
    expect(meta!.tags).toEqual([]);
  });

  test("handles empty ticket array", async ({}, testInfo) => {
    story.init(testInfo, { ticket: [] });

    const meta = getStoryMeta(testInfo);
    expect(meta!.tickets).toEqual([]);
  });

  test("handles empty meta object", async ({}, testInfo) => {
    story.init(testInfo, { meta: {} });

    const meta = getStoryMeta(testInfo);
    expect(meta!.meta).toEqual({});
  });
});

test.describe("special characters", () => {
  test("handles special characters in step text", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("a value with <brackets> & ampersand 'quotes' \"double\" `backticks`");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].text).toBe(
      "a value with <brackets> & ampersand 'quotes' \"double\" `backticks`"
    );
  });

  test("handles markdown in step text", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("**bold** and _italic_ and [link](url)");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].text).toBe("**bold** and _italic_ and [link](url)");
  });

  test("handles newlines in step text", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("line one\nline two\nline three");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].text).toContain("\n");
  });

  test("handles unicode characters", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("emoji: 🎉 🚀 ✅");
    story.when("Chinese: 你好世界");
    story.then("Arabic: مرحبا بالعالم");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].text).toContain("🎉");
    expect(meta!.steps[1].text).toContain("你好");
    expect(meta!.steps[2].text).toContain("مرحبا");
  });

  test("handles special characters in tags", async ({}, testInfo) => {
    story.init(testInfo, { tags: ["tag-with-dash", "tag_with_underscore", "tag.with.dots"] });

    const meta = getStoryMeta(testInfo);
    expect(meta!.tags).toEqual(["tag-with-dash", "tag_with_underscore", "tag.with.dots"]);
  });
});

test.describe("doc method edge cases", () => {
  test("story.tag() with single string", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("precondition");
    story.tag("single-tag");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(1);
    expect(meta!.steps[0].docs![0]).toEqual({
      kind: "tag",
      names: ["single-tag"],
      phase: "runtime",
    });
  });

  test("story.tag() with array", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("precondition");
    story.tag(["tag1", "tag2", "tag3"]);

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs![0]).toEqual({
      kind: "tag",
      names: ["tag1", "tag2", "tag3"],
      phase: "runtime",
    });
  });

  test("story.code() without lang parameter", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("code block");
    story.code({ label: "Script", content: "console.log('hello')" });

    const meta = getStoryMeta(testInfo);
    const entry = meta!.steps[0].docs![0] as { kind: "code"; lang?: string };
    expect(entry.kind).toBe("code");
    expect(entry.lang).toBeUndefined();
  });

  test("story.json() with null value", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("null data");
    story.json({ label: "Data", value: null });

    const meta = getStoryMeta(testInfo);
    const entry = meta!.steps[0].docs![0] as { kind: "code"; content: string };
    expect(entry.content).toBe("null");
  });

  test("story.json() with array value", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("array data");
    story.json({ label: "Items", value: [1, 2, 3] });

    const meta = getStoryMeta(testInfo);
    const entry = meta!.steps[0].docs![0] as { kind: "code"; content: string };
    expect(JSON.parse(entry.content)).toEqual([1, 2, 3]);
  });

  test("story.json() with deeply nested object", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("nested data");
    story.json({
      label: "Config",
      value: {
        level1: {
          level2: {
            level3: {
              value: "deep",
            },
          },
        },
      },
    });

    const meta = getStoryMeta(testInfo);
    const entry = meta!.steps[0].docs![0] as { kind: "code"; content: string };
    const parsed = JSON.parse(entry.content);
    expect(parsed.level1.level2.level3.value).toBe("deep");
  });

  test("story.table() with empty rows", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("empty table");
    story.table({ label: "Empty", columns: ["A", "B"], rows: [] });

    const meta = getStoryMeta(testInfo);
    const entry = meta!.steps[0].docs![0] as { kind: "table"; rows: string[][] };
    expect(entry.rows).toEqual([]);
  });

  test("story.kv() with complex value", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("complex kv");
    story.kv({ label: "Object", value: { nested: true } });

    const meta = getStoryMeta(testInfo);
    const entry = meta!.steps[0].docs![0] as { kind: "kv"; value: unknown };
    expect(entry.value).toEqual({ nested: true });
  });

  test("story.mermaid() without title", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("diagram");
    story.mermaid({ code: "graph LR; A-->B" });

    const meta = getStoryMeta(testInfo);
    const entry = meta!.steps[0].docs![0] as { kind: "mermaid"; title?: string };
    expect(entry.kind).toBe("mermaid");
    expect(entry.title).toBeUndefined();
  });

  test("story.screenshot() without alt", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("screenshot");
    story.screenshot({ path: "/path/to/image.png" });

    const meta = getStoryMeta(testInfo);
    const entry = meta!.steps[0].docs![0] as { kind: "screenshot"; alt?: string };
    expect(entry.kind).toBe("screenshot");
    expect(entry.alt).toBeUndefined();
  });
});

test.describe("inline docs edge cases", () => {
  test("step with all inline doc types", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("everything", {
      note: "A note",
      tag: ["tag1", "tag2"],
      kv: { key1: "value1", key2: "value2" },
      json: { label: "JSON", value: { foo: "bar" } },
      table: { label: "Table", columns: ["A"], rows: [["1"]] },
      link: { label: "Link", url: "https://example.com" },
      code: { label: "Code", content: "x = 1", lang: "python" },
      section: { title: "Section", markdown: "content" },
      mermaid: { code: "graph LR", title: "Diagram" },
      screenshot: { path: "/img.png", alt: "Image" },
      custom: { type: "myType", data: { custom: true } },
    });

    const meta = getStoryMeta(testInfo);
    // All doc types should be present
    expect(meta!.steps[0].docs!.length).toBeGreaterThanOrEqual(10);

    const kinds = meta!.steps[0].docs!.map((d) => d.kind);
    expect(kinds).toContain("note");
    expect(kinds).toContain("tag");
    expect(kinds).toContain("kv");
    expect(kinds).toContain("code"); // json becomes code with lang=json
    expect(kinds).toContain("table");
    expect(kinds).toContain("link");
    expect(kinds).toContain("section");
    expect(kinds).toContain("mermaid");
    expect(kinds).toContain("screenshot");
    expect(kinds).toContain("custom");
  });

  test("step with empty inline docs object", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("no docs", {});

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toEqual([]);
  });
});

test.describe("multiple docs on same step", () => {
  test("multiple note() calls attach to same step", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("precondition");
    story.note("First note");
    story.note("Second note");
    story.note("Third note");

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(3);
    expect(meta!.steps[0].docs!.every((d) => d.kind === "note")).toBe(true);
  });

  test("mixed doc types attach to same step", async ({}, testInfo) => {
    story.init(testInfo);
    story.when("action");
    story.note("A note");
    story.kv({ label: "Key", value: "Value" });
    story.json({ label: "Data", value: { x: 1 } });
    story.link({ label: "Link", url: "https://example.com" });

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].docs).toHaveLength(4);
    const kinds = meta!.steps[0].docs!.map((d) => d.kind);
    expect(kinds).toContain("note");
    expect(kinds).toContain("kv");
    expect(kinds).toContain("code"); // json becomes code
    expect(kinds).toContain("link");
  });
});

test.describe("story-level docs ordering", () => {
  test("multiple story-level docs before steps maintain order", async ({}, testInfo) => {
    story.init(testInfo);
    story.note("First note");
    story.link({ label: "API", url: "https://api.example.com" });
    story.note("Second note");
    story.given("then a step");

    const meta = getStoryMeta(testInfo);
    expect(meta!.docs).toHaveLength(3);
    expect(meta!.docs![0].kind).toBe("note");
    expect(meta!.docs![1].kind).toBe("link");
    expect(meta!.docs![2].kind).toBe("note");
  });
});

test.describe("long content", () => {
  test("handles very long step text", async ({}, testInfo) => {
    story.init(testInfo);
    const longText = "x".repeat(10000);
    story.given(longText);

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps[0].text).toBe(longText);
    expect(meta!.steps[0].text.length).toBe(10000);
  });

  test("handles many steps", async ({}, testInfo) => {
    story.init(testInfo);

    for (let i = 0; i < 100; i++) {
      story.and(`step ${i}`);
    }

    const meta = getStoryMeta(testInfo);
    expect(meta!.steps).toHaveLength(100);
  });

  test("handles many tags", async ({}, testInfo) => {
    const manyTags = Array.from({ length: 50 }, (_, i) => `tag${i}`);
    story.init(testInfo, { tags: manyTags });

    const meta = getStoryMeta(testInfo);
    expect(meta!.tags).toHaveLength(50);
  });
});

test.describe("annotation syncing", () => {
  test("annotation is updated after each step", async ({}, testInfo) => {
    story.init(testInfo);

    // After init, annotation should exist with empty steps
    let annotation = testInfo.annotations.find((a) => a.type === "story-meta");
    let meta = JSON.parse(annotation!.description!);
    expect(meta.steps).toHaveLength(0);

    story.given("first step");
    annotation = testInfo.annotations.find((a) => a.type === "story-meta");
    meta = JSON.parse(annotation!.description!);
    expect(meta.steps).toHaveLength(1);

    story.when("second step");
    annotation = testInfo.annotations.find((a) => a.type === "story-meta");
    meta = JSON.parse(annotation!.description!);
    expect(meta.steps).toHaveLength(2);

    story.then("third step");
    annotation = testInfo.annotations.find((a) => a.type === "story-meta");
    meta = JSON.parse(annotation!.description!);
    expect(meta.steps).toHaveLength(3);
  });

  test("annotation is updated after doc methods", async ({}, testInfo) => {
    story.init(testInfo);
    story.given("step");

    let annotation = testInfo.annotations.find((a) => a.type === "story-meta");
    let meta = JSON.parse(annotation!.description!);
    expect(meta.steps[0].docs).toHaveLength(0);

    story.note("a note");
    annotation = testInfo.annotations.find((a) => a.type === "story-meta");
    meta = JSON.parse(annotation!.description!);
    expect(meta.steps[0].docs).toHaveLength(1);
  });
});
