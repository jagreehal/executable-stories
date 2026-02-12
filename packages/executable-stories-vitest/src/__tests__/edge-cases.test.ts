/**
 * Edge case tests for the story API.
 *
 * Tests boundary conditions, special characters, empty values, and unusual usage patterns.
 */
import { describe, it, expect } from "vitest";
import { story } from "../story-api";
import type { StoryMeta } from "../types";

function getStoryMeta(task: { meta: object }): StoryMeta {
  return (task.meta as { story: StoryMeta }).story;
}

describe("edge cases", () => {
  describe("empty and minimal values", () => {
    it("handles empty step text", ({ task }) => {
      story.init(task);
      story.given("");

      const meta = getStoryMeta(task);
      expect(meta.steps).toHaveLength(1);
      expect(meta.steps[0].text).toBe("");
    });

    it("handles whitespace-only step text", ({ task }) => {
      story.init(task);
      story.given("   ");

      const meta = getStoryMeta(task);
      expect(meta.steps).toHaveLength(1);
      expect(meta.steps[0].text).toBe("   ");
    });

    it("handles scenario with no steps", ({ task }) => {
      story.init(task);

      const meta = getStoryMeta(task);
      expect(meta.steps).toEqual([]);
      expect(meta.scenario).toBe("handles scenario with no steps");
    });

    it("handles empty tags array", ({ task }) => {
      story.init(task, { tags: [] });

      const meta = getStoryMeta(task);
      expect(meta.tags).toEqual([]);
    });

    it("handles empty ticket array", ({ task }) => {
      story.init(task, { ticket: [] });

      const meta = getStoryMeta(task);
      expect(meta.tickets).toEqual([]);
    });

    it("handles empty meta object", ({ task }) => {
      story.init(task, { meta: {} });

      const meta = getStoryMeta(task);
      expect(meta.meta).toEqual({});
    });
  });

  describe("special characters", () => {
    it("handles special characters in step text", ({ task }) => {
      story.init(task);
      story.given("a value with <brackets> & ampersand 'quotes' \"double\" `backticks`");

      const meta = getStoryMeta(task);
      expect(meta.steps[0].text).toBe(
        "a value with <brackets> & ampersand 'quotes' \"double\" `backticks`"
      );
    });

    it("handles markdown in step text", ({ task }) => {
      story.init(task);
      story.given("**bold** and _italic_ and [link](url)");

      const meta = getStoryMeta(task);
      expect(meta.steps[0].text).toBe("**bold** and _italic_ and [link](url)");
    });

    it("handles newlines in step text", ({ task }) => {
      story.init(task);
      story.given("line one\nline two\nline three");

      const meta = getStoryMeta(task);
      expect(meta.steps[0].text).toContain("\n");
    });

    it("handles unicode characters", ({ task }) => {
      story.init(task);
      story.given("emoji: 🎉 🚀 ✅");
      story.when("Chinese: 你好世界");
      story.then("Arabic: مرحبا بالعالم");

      const meta = getStoryMeta(task);
      expect(meta.steps[0].text).toContain("🎉");
      expect(meta.steps[1].text).toContain("你好");
      expect(meta.steps[2].text).toContain("مرحبا");
    });

    it("handles special characters in tags", ({ task }) => {
      story.init(task, { tags: ["tag-with-dash", "tag_with_underscore", "tag.with.dots"] });

      const meta = getStoryMeta(task);
      expect(meta.tags).toEqual(["tag-with-dash", "tag_with_underscore", "tag.with.dots"]);
    });
  });

  describe("doc method edge cases", () => {
    it("story.tag() with single string", ({ task }) => {
      story.init(task);
      story.given("precondition");
      story.tag("single-tag");

      const meta = getStoryMeta(task);
      expect(meta.steps[0].docs).toHaveLength(1);
      expect(meta.steps[0].docs![0]).toEqual({
        kind: "tag",
        names: ["single-tag"],
        phase: "runtime",
      });
    });

    it("story.tag() with array", ({ task }) => {
      story.init(task);
      story.given("precondition");
      story.tag(["tag1", "tag2", "tag3"]);

      const meta = getStoryMeta(task);
      expect(meta.steps[0].docs![0]).toEqual({
        kind: "tag",
        names: ["tag1", "tag2", "tag3"],
        phase: "runtime",
      });
    });

    it("story.code() without lang parameter", ({ task }) => {
      story.init(task);
      story.given("code block");
      story.code({ label: "Script", content: "console.log('hello')" });

      const meta = getStoryMeta(task);
      const entry = meta.steps[0].docs![0] as { kind: "code"; lang?: string };
      expect(entry.kind).toBe("code");
      expect(entry.lang).toBeUndefined();
    });

    it("story.json() with null value", ({ task }) => {
      story.init(task);
      story.given("null data");
      story.json({ label: "Data", value: null });

      const meta = getStoryMeta(task);
      const entry = meta.steps[0].docs![0] as { kind: "code"; content: string };
      expect(entry.content).toBe("null");
    });

    it("story.json() with array value", ({ task }) => {
      story.init(task);
      story.given("array data");
      story.json({ label: "Items", value: [1, 2, 3] });

      const meta = getStoryMeta(task);
      const entry = meta.steps[0].docs![0] as { kind: "code"; content: string };
      expect(JSON.parse(entry.content)).toEqual([1, 2, 3]);
    });

    it("story.json() with deeply nested object", ({ task }) => {
      story.init(task);
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

      const meta = getStoryMeta(task);
      const entry = meta.steps[0].docs![0] as { kind: "code"; content: string };
      const parsed = JSON.parse(entry.content);
      expect(parsed.level1.level2.level3.value).toBe("deep");
    });

    it("story.table() with empty rows", ({ task }) => {
      story.init(task);
      story.given("empty table");
      story.table({ label: "Empty", columns: ["A", "B"], rows: [] });

      const meta = getStoryMeta(task);
      const entry = meta.steps[0].docs![0] as { kind: "table"; rows: string[][] };
      expect(entry.rows).toEqual([]);
    });

    it("story.kv() with complex value", ({ task }) => {
      story.init(task);
      story.given("complex kv");
      story.kv({ label: "Object", value: { nested: true } });

      const meta = getStoryMeta(task);
      const entry = meta.steps[0].docs![0] as { kind: "kv"; value: unknown };
      expect(entry.value).toEqual({ nested: true });
    });

    it("story.mermaid() without title", ({ task }) => {
      story.init(task);
      story.given("diagram");
      story.mermaid({ code: "graph LR; A-->B" });

      const meta = getStoryMeta(task);
      const entry = meta.steps[0].docs![0] as { kind: "mermaid"; title?: string };
      expect(entry.kind).toBe("mermaid");
      expect(entry.title).toBeUndefined();
    });

    it("story.screenshot() without alt", ({ task }) => {
      story.init(task);
      story.given("screenshot");
      story.screenshot({ path: "/path/to/image.png" });

      const meta = getStoryMeta(task);
      const entry = meta.steps[0].docs![0] as { kind: "screenshot"; alt?: string };
      expect(entry.kind).toBe("screenshot");
      expect(entry.alt).toBeUndefined();
    });
  });

  describe("inline docs edge cases", () => {
    it("step with all inline doc types", ({ task }) => {
      story.init(task);
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

      const meta = getStoryMeta(task);
      // All doc types should be present
      expect(meta.steps[0].docs!.length).toBeGreaterThanOrEqual(10);

      const kinds = meta.steps[0].docs!.map((d) => d.kind);
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

    it("step with empty inline docs object", ({ task }) => {
      story.init(task);
      story.given("no docs", {});

      const meta = getStoryMeta(task);
      expect(meta.steps[0].docs).toEqual([]);
    });
  });

  describe("multiple docs on same step", () => {
    it("multiple note() calls attach to same step", ({ task }) => {
      story.init(task);
      story.given("precondition");
      story.note("First note");
      story.note("Second note");
      story.note("Third note");

      const meta = getStoryMeta(task);
      expect(meta.steps[0].docs).toHaveLength(3);
      expect(meta.steps[0].docs!.every((d) => d.kind === "note")).toBe(true);
    });

    it("mixed doc types attach to same step", ({ task }) => {
      story.init(task);
      story.when("action");
      story.note("A note");
      story.kv({ label: "Key", value: "Value" });
      story.json({ label: "Data", value: { x: 1 } });
      story.link({ label: "Link", url: "https://example.com" });

      const meta = getStoryMeta(task);
      expect(meta.steps[0].docs).toHaveLength(4);
      const kinds = meta.steps[0].docs!.map((d) => d.kind);
      expect(kinds).toContain("note");
      expect(kinds).toContain("kv");
      expect(kinds).toContain("code"); // json becomes code
      expect(kinds).toContain("link");
    });
  });

  describe("story-level docs ordering", () => {
    it("multiple story-level docs before steps maintain order", ({ task }) => {
      story.init(task);
      story.note("First note");
      story.link({ label: "API", url: "https://api.example.com" });
      story.note("Second note");
      story.given("then a step");

      const meta = getStoryMeta(task);
      expect(meta.docs).toHaveLength(3);
      expect(meta.docs![0].kind).toBe("note");
      expect(meta.docs![1].kind).toBe("link");
      expect(meta.docs![2].kind).toBe("note");
    });
  });

  describe("long content", () => {
    it("handles very long step text", ({ task }) => {
      story.init(task);
      const longText = "x".repeat(10000);
      story.given(longText);

      const meta = getStoryMeta(task);
      expect(meta.steps[0].text).toBe(longText);
      expect(meta.steps[0].text.length).toBe(10000);
    });

    it("handles many steps", ({ task }) => {
      story.init(task);

      for (let i = 0; i < 100; i++) {
        story.and(`step ${i}`);
      }

      const meta = getStoryMeta(task);
      expect(meta.steps).toHaveLength(100);
    });

    it("handles many tags", ({ task }) => {
      const manyTags = Array.from({ length: 50 }, (_, i) => `tag${i}`);
      story.init(task, { tags: manyTags });

      const meta = getStoryMeta(task);
      expect(meta.tags).toHaveLength(50);
    });
  });
});
