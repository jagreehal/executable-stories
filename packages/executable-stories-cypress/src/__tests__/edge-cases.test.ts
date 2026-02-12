/**
 * Edge case tests for store and buildRawRunFromCypressResult.
 * Mirrors Playwright edge-cases: empty/minimal values, special characters,
 * doc edge cases, long content.
 */
import { describe, it, expect, afterEach } from "vitest";
import { buildRawRunFromCypressResult, type CypressRunResult } from "../reporter";
import { recordMeta, clearStore } from "../store";
import type { RecordMetaPayload } from "../types";
import type { StoryMeta } from "../types";

function makePayload(
  specRelative: string,
  titlePath: string[],
  meta: StoryMeta
): RecordMetaPayload {
  return { specRelative, titlePath, meta };
}

function makeResult(
  specRelative: string,
  tests: Array<{ title: string[]; state?: string }>
): CypressRunResult {
  return {
    runs: [{ spec: { relative: specRelative }, tests }],
    config: { projectRoot: process.cwd() },
  };
}

describe("edge cases", () => {
  afterEach(() => {
    clearStore();
  });

  describe("empty and minimal values", () => {
    it("handles empty step text", () => {
      const payload = makePayload("spec.cy.ts", ["Suite", "empty step"], {
        scenario: "empty step",
        steps: [{ keyword: "Given", text: "", docs: [] }],
      });
      recordMeta(payload);
      const result = makeResult("spec.cy.ts", [
        { title: ["Suite", "empty step"], state: "passed" },
      ]);
      const rawRun = buildRawRunFromCypressResult(result);
      expect(rawRun.testCases[0].story!.steps[0].text).toBe("");
    });

    it("handles whitespace-only step text", () => {
      const payload = makePayload("spec.cy.ts", ["Suite", "whitespace"], {
        scenario: "whitespace",
        steps: [{ keyword: "Given", text: "   ", docs: [] }],
      });
      recordMeta(payload);
      const result = makeResult("spec.cy.ts", [
        { title: ["Suite", "whitespace"], state: "passed" },
      ]);
      const rawRun = buildRawRunFromCypressResult(result);
      expect(rawRun.testCases[0].story!.steps[0].text).toBe("   ");
    });

    it("handles scenario with no steps", () => {
      const payload = makePayload("spec.cy.ts", ["Suite", "no steps"], {
        scenario: "no steps",
        steps: [],
      });
      recordMeta(payload);
      const result = makeResult("spec.cy.ts", [
        { title: ["Suite", "no steps"], state: "passed" },
      ]);
      const rawRun = buildRawRunFromCypressResult(result);
      expect(rawRun.testCases[0].story!.steps).toEqual([]);
    });

    it("handles empty tags array", () => {
      const payload = makePayload("spec.cy.ts", ["Suite", "empty tags"], {
        scenario: "empty tags",
        steps: [],
        tags: [],
      });
      recordMeta(payload);
      const result = makeResult("spec.cy.ts", [
        { title: ["Suite", "empty tags"], state: "passed" },
      ]);
      const rawRun = buildRawRunFromCypressResult(result);
      expect(rawRun.testCases[0].story!.tags).toEqual([]);
    });

    it("handles empty tickets array", () => {
      const payload = makePayload("spec.cy.ts", ["Suite", "empty tickets"], {
        scenario: "empty tickets",
        steps: [],
        tickets: [],
      });
      recordMeta(payload);
      const result = makeResult("spec.cy.ts", [
        { title: ["Suite", "empty tickets"], state: "passed" },
      ]);
      const rawRun = buildRawRunFromCypressResult(result);
      expect(rawRun.testCases[0].story!.tickets).toEqual([]);
    });

    it("handles empty meta object", () => {
      const payload = makePayload("spec.cy.ts", ["Suite", "empty meta"], {
        scenario: "empty meta",
        steps: [],
        meta: {},
      });
      recordMeta(payload);
      const result = makeResult("spec.cy.ts", [
        { title: ["Suite", "empty meta"], state: "passed" },
      ]);
      const rawRun = buildRawRunFromCypressResult(result);
      expect(rawRun.testCases[0].story!.meta).toEqual({});
    });
  });

  describe("special characters", () => {
    it("handles special characters in step text", () => {
      const text = "a value with <brackets> & ampersand 'quotes' \"double\" `backticks`";
      const payload = makePayload("spec.cy.ts", ["Suite", "special"], {
        scenario: "special",
        steps: [{ keyword: "Given", text, docs: [] }],
      });
      recordMeta(payload);
      const result = makeResult("spec.cy.ts", [
        { title: ["Suite", "special"], state: "passed" },
      ]);
      const rawRun = buildRawRunFromCypressResult(result);
      expect(rawRun.testCases[0].story!.steps[0].text).toBe(text);
    });

    it("handles unicode characters", () => {
      const payload = makePayload("spec.cy.ts", ["Suite", "unicode"], {
        scenario: "unicode",
        steps: [
          { keyword: "Given", text: "emoji: 🎉 🚀 ✅", docs: [] },
          { keyword: "When", text: "Chinese: 你好世界", docs: [] },
          { keyword: "Then", text: "Arabic: مرحبا بالعالم", docs: [] },
        ],
      });
      recordMeta(payload);
      const result = makeResult("spec.cy.ts", [
        { title: ["Suite", "unicode"], state: "passed" },
      ]);
      const rawRun = buildRawRunFromCypressResult(result);
      expect(rawRun.testCases[0].story!.steps[0].text).toContain("🎉");
      expect(rawRun.testCases[0].story!.steps[1].text).toContain("你好");
      expect(rawRun.testCases[0].story!.steps[2].text).toContain("مرحبا");
    });

    it("handles special characters in tags", () => {
      const payload = makePayload("spec.cy.ts", ["Suite", "tag special"], {
        scenario: "tag special",
        steps: [],
        tags: ["tag-with-dash", "tag_with_underscore", "tag.with.dots"],
      });
      recordMeta(payload);
      const result = makeResult("spec.cy.ts", [
        { title: ["Suite", "tag special"], state: "passed" },
      ]);
      const rawRun = buildRawRunFromCypressResult(result);
      expect(rawRun.testCases[0].story!.tags).toEqual([
        "tag-with-dash",
        "tag_with_underscore",
        "tag.with.dots",
      ]);
    });
  });

  describe("doc edge cases", () => {
    it("story with note doc", () => {
      const payload = makePayload("spec.cy.ts", ["Suite", "with note"], {
        scenario: "with note",
        steps: [
          {
            keyword: "Given",
            text: "precondition",
            docs: [{ kind: "note", text: "A note", phase: "runtime" }],
          },
        ],
      });
      recordMeta(payload);
      const result = makeResult("spec.cy.ts", [
        { title: ["Suite", "with note"], state: "passed" },
      ]);
      const rawRun = buildRawRunFromCypressResult(result);
      expect(rawRun.testCases[0].story!.steps[0].docs).toHaveLength(1);
      expect(rawRun.testCases[0].story!.steps[0].docs![0]).toEqual({
        kind: "note",
        text: "A note",
        phase: "runtime",
      });
    });

    it("story with code doc without lang", () => {
      const payload = makePayload("spec.cy.ts", ["Suite", "code no lang"], {
        scenario: "code no lang",
        steps: [
          {
            keyword: "Given",
            text: "code block",
            docs: [
              {
                kind: "code",
                label: "Script",
                content: "console.log('hello')",
                phase: "runtime",
              },
            ],
          },
        ],
      });
      recordMeta(payload);
      const result = makeResult("spec.cy.ts", [
        { title: ["Suite", "code no lang"], state: "passed" },
      ]);
      const rawRun = buildRawRunFromCypressResult(result);
      const entry = rawRun.testCases[0].story!.steps[0].docs![0] as {
        kind: "code";
        lang?: string;
      };
      expect(entry.kind).toBe("code");
      expect(entry.lang).toBeUndefined();
    });

    it("story with screenshot doc without alt", () => {
      const payload = makePayload("spec.cy.ts", ["Suite", "screenshot"], {
        scenario: "screenshot",
        steps: [
          {
            keyword: "Given",
            text: "screenshot",
            docs: [
              {
                kind: "screenshot",
                path: "/path/to/image.png",
                phase: "runtime",
              },
            ],
          },
        ],
      });
      recordMeta(payload);
      const result = makeResult("spec.cy.ts", [
        { title: ["Suite", "screenshot"], state: "passed" },
      ]);
      const rawRun = buildRawRunFromCypressResult(result);
      const entry = rawRun.testCases[0].story!.steps[0].docs![0] as {
        kind: "screenshot";
        alt?: string;
      };
      expect(entry.kind).toBe("screenshot");
      expect(entry.alt).toBeUndefined();
    });
  });

  describe("long content", () => {
    it("handles very long step text", () => {
      const longText = "x".repeat(10000);
      const payload = makePayload("spec.cy.ts", ["Suite", "long"], {
        scenario: "long",
        steps: [{ keyword: "Given", text: longText, docs: [] }],
      });
      recordMeta(payload);
      const result = makeResult("spec.cy.ts", [
        { title: ["Suite", "long"], state: "passed" },
      ]);
      const rawRun = buildRawRunFromCypressResult(result);
      expect(rawRun.testCases[0].story!.steps[0].text).toBe(longText);
      expect(rawRun.testCases[0].story!.steps[0].text.length).toBe(10000);
    });

    it("handles many steps", () => {
      const steps = Array.from({ length: 100 }, (_, i) => ({
        keyword: "And" as const,
        text: `step ${i}`,
        docs: [] as const,
      }));
      const payload = makePayload("spec.cy.ts", ["Suite", "many steps"], {
        scenario: "many steps",
        steps,
      });
      recordMeta(payload);
      const result = makeResult("spec.cy.ts", [
        { title: ["Suite", "many steps"], state: "passed" },
      ]);
      const rawRun = buildRawRunFromCypressResult(result);
      expect(rawRun.testCases[0].story!.steps).toHaveLength(100);
    });

    it("handles many tags", () => {
      const manyTags = Array.from({ length: 50 }, (_, i) => `tag${i}`);
      const payload = makePayload("spec.cy.ts", ["Suite", "many tags"], {
        scenario: "many tags",
        steps: [],
        tags: manyTags,
      });
      recordMeta(payload);
      const result = makeResult("spec.cy.ts", [
        { title: ["Suite", "many tags"], state: "passed" },
      ]);
      const rawRun = buildRawRunFromCypressResult(result);
      expect(rawRun.testCases[0].story!.tags).toHaveLength(50);
    });
  });
});
