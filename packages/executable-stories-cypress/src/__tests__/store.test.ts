/**
 * Tests for the Node store (recordMeta, getMeta, clearStore).
 */
import { describe, it, expect, afterEach } from "vitest";
import { recordMeta, getMeta, getAllMeta, clearStore } from "../store";
import type { RecordMetaPayload } from "../types";

describe("store", () => {
  afterEach(() => {
    clearStore();
  });

  it("records and retrieves meta by spec and titlePath", () => {
    const payload: RecordMetaPayload = {
      specRelative: "cypress/e2e/calc.cy.ts",
      titlePath: ["Calculator", "adds two numbers"],
      meta: {
        scenario: "adds two numbers",
        steps: [
          { keyword: "Given", text: "two numbers", docs: [] },
          { keyword: "When", text: "I add them", docs: [] },
          { keyword: "Then", text: "I get the sum", docs: [] },
        ],
      },
    };

    expect(recordMeta(payload)).toBeNull();

    const retrieved = getMeta(payload.specRelative, payload.titlePath);
    expect(retrieved).toBeDefined();
    expect(retrieved!.scenario).toBe("adds two numbers");
    expect(retrieved!.steps).toHaveLength(3);
  });

  it("returns undefined for unknown key", () => {
    expect(getMeta("other/spec.cy.ts", ["Suite", "test"])).toBeUndefined();
  });

  it("getAllMeta returns all recorded entries", () => {
    recordMeta({
      specRelative: "a.cy.ts",
      titlePath: ["A"],
      meta: { scenario: "A", steps: [] },
    });
    recordMeta({
      specRelative: "b.cy.ts",
      titlePath: ["B"],
      meta: { scenario: "B", steps: [] },
    });

    const all = getAllMeta();
    expect(all).toHaveLength(2);
  });

  it("clearStore removes all entries", () => {
    recordMeta({
      specRelative: "a.cy.ts",
      titlePath: ["A"],
      meta: { scenario: "A", steps: [] },
    });
    clearStore();
    expect(getMeta("a.cy.ts", ["A"])).toBeUndefined();
    expect(getAllMeta()).toHaveLength(0);
  });
});
