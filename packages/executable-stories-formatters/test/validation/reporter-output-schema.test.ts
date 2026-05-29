/**
 * Schema validation tests guarding against drift between raw-run.schema.json and
 * what the official reporters actually emit.
 *
 * The Playwright/Vitest reporters emit inline-body attachments (body/encoding/
 * byteLength) and rich CI info (provider/branch/commitSha/prNumber). The review
 * pipeline is the first consumer to validate reporter output through the binary,
 * which surfaced these as "additional properties". These tests lock the schema
 * to the reporter's real shape.
 */

import { describe, it, expect } from "vitest";
import { validateRawRun } from "../../src/validation/schema-validator";

function rawRun(extra: Record<string, unknown>) {
  return {
    schemaVersion: 1,
    projectRoot: "/project",
    testCases: [{ status: "pass", story: { scenario: "test" } }],
    ...extra,
  };
}

describe("raw-run schema accepts real reporter output", () => {
  it("accepts inline-body attachments (base64 screenshots)", () => {
    const result = validateRawRun({
      schemaVersion: 1,
      projectRoot: "/project",
      testCases: [
        {
          status: "pass",
          story: { scenario: "test" },
          attachments: [
            {
              name: "screenshot",
              mediaType: "image/png",
              body: "aGVsbG8=",
              encoding: "BASE64",
              byteLength: 5,
              fileName: "shot.png",
            },
          ],
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts path-based attachments (no body)", () => {
    const result = validateRawRun({
      schemaVersion: 1,
      projectRoot: "/project",
      testCases: [
        {
          status: "pass",
          story: { scenario: "test" },
          attachments: [{ name: "log", mediaType: "text/plain", path: "out.log" }],
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts rich CI info (provider/branch/commitSha/prNumber)", () => {
    const result = validateRawRun(
      rawRun({
        ci: {
          name: "GitHub Actions",
          provider: "github",
          branch: "feat/x",
          commitSha: "abc123",
          prNumber: "7",
          url: "https://example.com/run/1",
          buildNumber: "1",
        },
      })
    );
    expect(result.valid).toBe(true);
  });

  it("still rejects genuinely unknown attachment properties", () => {
    const result = validateRawRun({
      schemaVersion: 1,
      projectRoot: "/project",
      testCases: [
        {
          status: "pass",
          story: { scenario: "test" },
          attachments: [{ name: "x", mediaType: "image/png", bogusField: true }],
        },
      ],
    });
    expect(result.valid).toBe(false);
  });
});
