import { describe, expect, it } from "vitest";
import { toStoryReport } from "executable-stories-core/converters/story-report";
import type { TestRunResult } from "executable-stories-core/types/test-result";

/**
 * A ticket id renders as dead text in every surface that reads a StoryReport
 * unless something resolves it to a URL. The template lives in the converter,
 * not in one renderer, so the HTML report, the Astro pages and the JSON
 * contract cannot disagree about where a ticket points.
 */
function runWithTickets(tickets: { id: string; url?: string }[]): TestRunResult {
  return {
    runId: "r1",
    startedAtMs: 0,
    finishedAtMs: 1,
    durationMs: 1,
    projectRoot: "/repo",
    summary: { total: 1, passed: 1, failed: 0, skipped: 0, pending: 0, durationMs: 1 },
    testCases: [
      {
        id: "tc1",
        title: "Payment captured",
        titlePath: ["Payment captured"],
        sourceFile: "src/pay.story.test.ts",
        sourceLine: 10,
        status: "passed",
        durationMs: 1,
        tags: [],
        stepResults: [],
        attachments: [],
        story: { scenario: "Payment captured", steps: [], tickets },
      },
    ],
  } as unknown as TestRunResult;
}

const ticketsOf = (run: TestRunResult, ticketUrlTemplate?: string) =>
  toStoryReport(run, ticketUrlTemplate ? { ticketUrlTemplate } : undefined).features[0]
    .scenarios[0].tickets;

describe("ticketUrlTemplate on the StoryReport converter", () => {
  it("resolves a ticket that has no URL of its own", () => {
    expect(
      ticketsOf(runWithTickets([{ id: "PAY-1042" }]), "https://jira.example.com/browse/{ticket}"),
    ).toEqual([{ id: "PAY-1042", url: "https://jira.example.com/browse/PAY-1042" }]);
  });

  it("leaves a ticket alone when no template is given", () => {
    // Absent, not an empty string: a renderer decides between a link and plain
    // text on whether the field is there.
    expect(ticketsOf(runWithTickets([{ id: "PAY-1042" }]))).toEqual([{ id: "PAY-1042" }]);
  });

  it("keeps a URL the adapter already attached", () => {
    // The adapter knew something the template does not — a ticket in another
    // tracker, or one whose id does not fit the project's URL shape.
    expect(
      ticketsOf(
        runWithTickets([{ id: "OPS-7", url: "https://other.example.com/OPS-7" }]),
        "https://jira.example.com/browse/{ticket}",
      ),
    ).toEqual([{ id: "OPS-7", url: "https://other.example.com/OPS-7" }]);
  });

  it("resolves every ticket on a scenario", () => {
    expect(
      ticketsOf(
        runWithTickets([{ id: "PAY-1" }, { id: "PAY-2" }]),
        "https://jira.example.com/browse/{ticket}",
      ),
    ).toEqual([
      { id: "PAY-1", url: "https://jira.example.com/browse/PAY-1" },
      { id: "PAY-2", url: "https://jira.example.com/browse/PAY-2" },
    ]);
  });
});
