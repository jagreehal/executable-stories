import { describe, it, expect, beforeEach } from "vitest";
import { renderFailureSummary } from "../../../../src/formatters/html/renderers/failure-summary";
import { escapeHtml } from "../../../../src/formatters/html/template";
import { stubs } from "../../../stubs";

describe("renderFailureSummary", () => {
  beforeEach(() => {
    stubs.setFakerSeed(42);
  });

  it("renders nothing for empty failures", () => {
    const result = renderFailureSummary(
      { failedCases: [] },
      { escapeHtml },
    );
    expect(result).toBe("");
  });

  it("renders failure links for failed test cases", () => {
    const tc1 = stubs.testCaseResult({
      id: "abc123",
      status: "failed",
      story: stubs.storyMeta({ scenario: "Login fails for bad credentials" }),
    });
    const tc2 = stubs.testCaseResult({
      id: "def456",
      status: "failed",
      story: stubs.storyMeta({ scenario: "Signup validation error" }),
    });

    const result = renderFailureSummary(
      { failedCases: [tc1, tc2] },
      { escapeHtml },
    );

    expect(result).toContain("Failed (2)");
    expect(result).toContain('href="#scenario-abc123"');
    expect(result).toContain('href="#scenario-def456"');
    expect(result).toContain("Login fails for bad credentials");
    expect(result).toContain("Signup validation error");
    expect(result).toContain('class="failure-summary"');
    expect(result).toContain("compare --pr-summary");
  });
});
