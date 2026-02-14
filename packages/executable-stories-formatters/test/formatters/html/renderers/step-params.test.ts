/**
 * Unit tests for highlightStepParams.
 */

import { describe, it, expect } from "vitest";
import { highlightStepParams } from "../../../../src/formatters/html/renderers/step-params";

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const deps = { escapeHtml };

const param = (text: string) =>
  `<span class="step-param">${escapeHtml(text)}</span>`;

describe("highlightStepParams", () => {
  describe("quoted strings", () => {
    it("highlights a double-quoted string", () => {
      expect(highlightStepParams('I see "hello"', deps)).toBe(
        `I see ${param('"hello"')}`,
      );
    });

    it("highlights an empty quoted string", () => {
      expect(highlightStepParams('value is ""', deps)).toBe(
        `value is ${param('""')}`,
      );
    });

    it("highlights a quoted string containing a number as a single unit", () => {
      expect(highlightStepParams('I see "hello 42 world"', deps)).toBe(
        `I see ${param('"hello 42 world"')}`,
      );
    });
  });

  describe("standalone numbers", () => {
    it("highlights an integer", () => {
      expect(highlightStepParams("I have 42 items", deps)).toBe(
        `I have ${param("42")} items`,
      );
    });

    it("highlights a decimal number", () => {
      expect(highlightStepParams("price is 3.14", deps)).toBe(
        `price is ${param("3.14")}`,
      );
    });

    it("highlights a number at the start of text", () => {
      expect(highlightStepParams("5 items remain", deps)).toBe(
        `${param("5")} items remain`,
      );
    });

    it("highlights a number at the end of text", () => {
      expect(highlightStepParams("count is 99", deps)).toBe(
        `count is ${param("99")}`,
      );
    });
  });

  describe("non-matches (locked convention)", () => {
    it("does not highlight numbers inside words (version2)", () => {
      expect(highlightStepParams("version2 is active", deps)).toBe(
        "version2 is active",
      );
    });

    it("does not highlight numbers at start of alphanumeric (2nd)", () => {
      expect(highlightStepParams("the 2nd item", deps)).toBe(
        "the 2nd item",
      );
    });

    it("does not highlight negative numbers (-5)", () => {
      expect(highlightStepParams("offset is -5", deps)).toBe(
        "offset is -5",
      );
    });

    it("does not highlight scientific notation (1e6)", () => {
      expect(highlightStepParams("value is 1e6", deps)).toBe(
        "value is 1e6",
      );
    });

    it("does not partially highlight dotted version strings (2.0.1)", () => {
      const result = highlightStepParams("running version 2.0.1", deps);
      expect(result).not.toContain("step-param");
    });

    it("does not partially highlight numeric ranges (5-10)", () => {
      const result = highlightStepParams("allowed range is 5-10", deps);
      expect(result).not.toContain("step-param");
    });
  });

  describe("combined", () => {
    it("highlights both number and quoted string", () => {
      expect(
        highlightStepParams('I have 5 items in "my cart"', deps),
      ).toBe(`I have ${param("5")} items in ${param('"my cart"')}`);
    });

    it("highlights multiple quoted strings", () => {
      expect(highlightStepParams('"a" and "b"', deps)).toBe(
        `${param('"a"')} and ${param('"b"')}`,
      );
    });
  });

  describe("adjacent punctuation", () => {
    it("highlights number followed by comma", () => {
      expect(highlightStepParams("I have 5, items", deps)).toBe(
        `I have ${param("5")}, items`,
      );
    });

    it("highlights number after equals sign", () => {
      expect(highlightStepParams("value=42", deps)).toBe(
        `value=${param("42")}`,
      );
    });
  });

  describe("escaped quotes (v1 behavior)", () => {
    it("documents that backslash-escaped quotes terminate early", () => {
      // In v1, \"hello\" produces two separate matches: \"hello\" and a trailing \"
      // This is acceptable since step text rarely contains escaped quotes.
      const result = highlightStepParams('she said \\"hello\\"', deps);
      expect(result).toContain("step-param");
    });
  });

  describe("HTML escaping", () => {
    it("escapes HTML in plain text segments", () => {
      const result = highlightStepParams("<script> runs", deps);
      expect(result).toContain("&lt;script&gt;");
      expect(result).not.toContain("<script>");
    });

    it("escapes HTML inside param spans", () => {
      const result = highlightStepParams('I see "<b>bold</b>"', deps);
      expect(result).toContain("&lt;b&gt;bold&lt;/b&gt;");
      expect(result).toContain("step-param");
    });
  });

  describe("no params", () => {
    it("returns escaped text with no spans when no matches", () => {
      const result = highlightStepParams("user is on login page", deps);
      expect(result).toBe("user is on login page");
      expect(result).not.toContain("step-param");
    });
  });
});
