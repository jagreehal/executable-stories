import { describe, it, expect, beforeEach } from "vitest";
import { renderScenario } from "../../../../src/formatters/html/renderers/scenario";
import { escapeHtml } from "../../../../src/formatters/html/template";
import { stubs } from "../../../stubs";

const baseDeps = {
  escapeHtml,
  getStatusIcon: (status: string) => (status === "passed" ? "\u2705" : "\u274C"),
  startCollapsed: false,
  renderSteps: () => "",
  renderDocs: () => "",
  renderErrorBox: () => "",
  renderAttachments: () => "",
  renderTraceView: () => "",
  embedScreenshots: true,
};

describe("renderScenario", () => {
  beforeEach(() => {
    stubs.setFakerSeed(42);
  });

  it("renders scenario with id attribute", () => {
    const tc = stubs.testCaseResult({
      id: "abc123def",
      story: stubs.storyMeta({ scenario: "Test scenario", tags: [] }),
      tags: [],
    });

    const result = renderScenario({ tc }, baseDeps);

    expect(result).toContain('id="scenario-abc123def"');
  });

  it("renders source permalink when permalinkBaseUrl is set", () => {
    const tc = stubs.testCaseResult({
      id: "abc123",
      sourceFile: "src/auth/login.test.ts",
      sourceLine: 42,
      story: stubs.storyMeta({ scenario: "Login test", tags: [] }),
      tags: [],
    });

    const result = renderScenario(
      { tc },
      { ...baseDeps, permalinkBaseUrl: "https://github.com/org/repo/blob/main" },
    );

    expect(result).toContain('href="https://github.com/org/repo/blob/main/src/auth/login.test.ts#L42"');
    expect(result).toContain('class="source-link"');
    expect(result).toContain("src/auth/login.test.ts:42");
  });

  it("does not render source link without permalinkBaseUrl", () => {
    const tc = stubs.testCaseResult({
      sourceFile: "src/auth/login.test.ts",
      sourceLine: 42,
      story: stubs.storyMeta({ scenario: "Login test", tags: [] }),
      tags: [],
    });

    const result = renderScenario({ tc }, baseDeps);

    expect(result).not.toContain("source-link");
  });

  it("does not render source link when sourceFile is unknown", () => {
    const tc = stubs.testCaseResult({
      sourceFile: "unknown",
      sourceLine: 0,
      story: stubs.storyMeta({ scenario: "Unknown test", tags: [] }),
      tags: [],
    });

    const result = renderScenario(
      { tc },
      { ...baseDeps, permalinkBaseUrl: "https://github.com/org/repo/blob/main" },
    );

    expect(result).not.toContain("source-link");
  });

  it("renders ticket as plain span without template", () => {
    const tc = stubs.testCaseResult({
      story: stubs.storyMeta({
        scenario: "Ticket test",
        tags: [],
        tickets: [{ id: "JIRA-123" }],
      }),
      tags: [],
    });

    const result = renderScenario({ tc }, baseDeps);

    expect(result).toContain('<span class="tag ticket-tag">JIRA-123</span>');
    expect(result).not.toContain("<a ");
  });

  it("renders ticket as link with ticketUrlTemplate", () => {
    const tc = stubs.testCaseResult({
      story: stubs.storyMeta({
        scenario: "Ticket link test",
        tags: [],
        tickets: [{ id: "PAY-456" }],
      }),
      tags: [],
    });

    const result = renderScenario(
      { tc },
      { ...baseDeps, ticketUrlTemplate: "https://jira.example.com/browse/{ticket}" },
    );

    expect(result).toContain(
      '<a class="tag ticket-tag" href="https://jira.example.com/browse/PAY-456" target="_blank" rel="noopener noreferrer">PAY-456</a>',
    );
  });

  it("renders permalink anchor icon in scenario header", () => {
    const tc = stubs.testCaseResult({
      id: "anchor-test-123",
      story: stubs.storyMeta({ scenario: "Anchor test", tags: [] }),
      tags: [],
    });

    const result = renderScenario({ tc }, baseDeps);

    expect(result).toContain('class="permalink-anchor"');
    expect(result).toContain("copyPermalink('scenario-anchor-test-123')");
  });

  it("renders copy-as-markdown button in scenario header", () => {
    const tc = stubs.testCaseResult({
      id: "copy-md-test",
      story: stubs.storyMeta({ scenario: "Copy test", tags: [] }),
      tags: [],
    });

    const result = renderScenario({ tc }, baseDeps);

    expect(result).toContain('class="copy-scenario-btn"');
    expect(result).toContain("copyScenarioAsMarkdown('scenario-copy-md-test')");
  });

  it("renders ticket with explicit url (overrides template)", () => {
    const tc = stubs.testCaseResult({
      story: stubs.storyMeta({
        scenario: "Ticket explicit url test",
        tags: [],
        tickets: [{ id: "GH-789", url: "https://github.com/org/repo/issues/789" }],
      }),
      tags: [],
    });

    const result = renderScenario(
      { tc },
      { ...baseDeps, ticketUrlTemplate: "https://jira.example.com/browse/{ticket}" },
    );

    expect(result).toContain(
      '<a class="tag ticket-tag" href="https://github.com/org/repo/issues/789" target="_blank" rel="noopener noreferrer">GH-789</a>',
    );
    expect(result).not.toContain("jira.example.com");
  });

  it("renders outcome tag for timeout/interrupted raw statuses", () => {
    const timeoutTc = stubs.testCaseResult({
      rawStatus: "timeout",
      story: stubs.storyMeta({ scenario: "Timeout test", tags: [] }),
      tags: [],
    });
    const interruptedTc = stubs.testCaseResult({
      rawStatus: "interrupted",
      story: stubs.storyMeta({ scenario: "Interrupted test", tags: [] }),
      tags: [],
    });

    const timeoutHtml = renderScenario({ tc: timeoutTc }, baseDeps);
    const interruptedHtml = renderScenario({ tc: interruptedTc }, baseDeps);

    expect(timeoutHtml).toContain('class="tag outcome-tag"');
    expect(timeoutHtml).toContain("timeout");
    expect(interruptedHtml).toContain('class="tag outcome-tag"');
    expect(interruptedHtml).toContain("interrupted");
  });
});
