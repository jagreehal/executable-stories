/**
 * Schema validation tests for ticket objects in raw-run.schema.json.
 *
 * Verifies that tickets accept both string IDs (backward compat at schema level)
 * and object format with id and optional url.
 */

import { describe, it, expect } from "vitest";
import { validateRawRun } from "../../src/validation/schema-validator";

/** Minimal valid RawRun wrapping tickets in story metadata */
function rawRunWithTickets(tickets: unknown[]) {
  return {
    schemaVersion: 1,
    projectRoot: "/project",
    testCases: [
      {
        status: "pass",
        story: {
          scenario: "test",
          tickets,
        },
      },
    ],
  };
}

describe("Ticket objects in JSON schema", () => {
  it("should accept string tickets (backward compat)", () => {
    const result = validateRawRun(rawRunWithTickets(["JIRA-123", "PAY-456"]));
    expect(result.valid).toBe(true);
  });

  it("should accept ticket objects with id only", () => {
    const result = validateRawRun(
      rawRunWithTickets([{ id: "JIRA-123" }]),
    );
    expect(result.valid).toBe(true);
  });

  it("should accept ticket objects with id and url", () => {
    const result = validateRawRun(
      rawRunWithTickets([
        { id: "PAY-1042", url: "https://jira.example.com/browse/PAY-1042" },
      ]),
    );
    expect(result.valid).toBe(true);
  });

  it("should accept mixed string and object tickets", () => {
    const result = validateRawRun(
      rawRunWithTickets([
        "JIRA-100",
        { id: "PAY-200" },
        { id: "PAY-300", url: "https://example.com/PAY-300" },
      ]),
    );
    expect(result.valid).toBe(true);
  });

  it("should reject ticket objects without id", () => {
    const result = validateRawRun(
      rawRunWithTickets([{ url: "https://example.com" }]),
    );
    expect(result.valid).toBe(false);
  });

  it("should reject ticket objects with extra properties", () => {
    const result = validateRawRun(
      rawRunWithTickets([{ id: "JIRA-123", extra: "nope" }]),
    );
    expect(result.valid).toBe(false);
  });
});
